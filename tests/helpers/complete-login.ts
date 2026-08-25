import type { Locator, Page } from '@playwright/test';

import { isFirstPartyUrl } from '../../config/first-party';
import type { SiteCredentials } from './env';
import { assertLoginNotBlocked } from './login-guard';

const GOOGLE_BLOCKED =
  /couldn.?t sign you in|this browser or app may not be secure|unusual activity|verify it.?s you|2-step verification|authenticator|enter the code|recovery email|confirm you.?re not a robot|password was changed/i;

export function visiblePasswordField(page: Page): Locator {
  return page
    .getByLabel(/enter your password|^password$/i)
    .or(page.locator('input[name="Passwd"]'))
    .or(
      page.locator(
        'input[type="password"]:not([aria-hidden="true"]):not([name="hiddenPassword"]):not([tabindex="-1"])'
      )
    )
    .first();
}

export function googleIdentifierField(page: Page): Locator {
  return page.getByLabel(/email or phone/i).or(
    page.getByRole('textbox', { name: /email or phone|email/i })
  ).first();
}

export function googleNextButton(page: Page): Locator {
  return page
    .locator('#identifierNext, #passwordNext')
    .or(
      page.getByRole('button', {
        name: /^(next|nästa)$/i,
      })
    )
    .or(
      page.locator('button').filter({
        hasText: /^\s*(next|nästa)\s*$/i,
      })
    )
    .first();
}

export function isGoogleIdentityUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();

    return (
      host === 'accounts.google.com' ||
      host === 'accounts.google.se' ||
      host.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

async function fillQuietly(locator: Locator, value: string): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: 20_000 });

  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click();

  /*
   * Prefer Playwright's native fill().
   * Google identity inputs can occasionally ignore or lose
   * character-by-character keyboard input.
   */
  try {
    await locator.fill('');
    await locator.fill(value);
  } catch {
    await locator.press('ControlOrMeta+A');
    await locator.press('Backspace');
    await locator.pressSequentially(value, { delay: 30 });
  }

  await locator.page().waitForTimeout(250);

  let currentValue = await locator.inputValue().catch(() => '');

  /*
   * One keyboard fallback if the browser did not retain fill().
   */
  if (currentValue !== value) {
    await locator.click();
    await locator.press('ControlOrMeta+A');
    await locator.press('Backspace');
    await locator.pressSequentially(value, { delay: 30 });

    await locator.page().waitForTimeout(250);
    currentValue = await locator.inputValue().catch(() => '');
  }

  if (currentValue !== value) {
    throw new Error(
      'Login field did not retain the configured value after both fill and keyboard input.'
    );
  }
}

async function throwIfGoogleBlocked(
  page: Page,
  siteLabel: string
): Promise<void> {
  const blocked = page.getByText(GOOGLE_BLOCKED).first();

  if (await blocked.isVisible().catch(() => false)) {
    const kind = ((await blocked.innerText().catch(() => '')) || 'challenge')
      .slice(0, 80)
      .trim();
    throw new Error(
      `${siteLabel} Google sign-in was blocked (${kind}). Automated Chromium is treated as an insecure browser; auth setup launches Google Chrome when available.`
    );
  }
}

async function completeGoogleIdentityLogin(
  page: Page,
  credentials: SiteCredentials,
  siteLabel: string
): Promise<void> {
  const identifier = googleIdentifierField(page);

if (await identifier.isVisible().catch(() => false)) {
  await fillQuietly(identifier, credentials.email.trim());

  const enteredIdentifier = await identifier.inputValue();

  if (enteredIdentifier.trim() !== credentials.email.trim()) {
    throw new Error(
      `${siteLabel} Google identifier field did not retain the configured QA email.`
    );
  }

  await googleNextButton(page).click();
}

  await throwIfGoogleBlocked(page, siteLabel);

  const password = visiblePasswordField(page);

  try {
    await password.waitFor({ state: 'visible', timeout: 25_000 });
  } catch {
    await throwIfGoogleBlocked(page, siteLabel);
    throw new Error(
      `${siteLabel} Google password field did not appear after the identifier step.`
    );
  }

  await fillQuietly(password, credentials.password);
  await googleNextButton(page).click();
  await page.waitForTimeout(1_000);

  const passwordRejected = page.getByText(
    /password was changed|wrong password|incorrect password/i
  );

  if (await passwordRejected.isVisible().catch(() => false)) {
    throw new Error(
      `${siteLabel} Google rejected the password. Update NATION_TEST_PASSWORD and AI_SKILLS_TEST_PASSWORD in the gitignored .env (Google may have rotated it).`
    );
  }

  await throwIfGoogleBlocked(page, siteLabel);

  await throwIfGoogleBlocked(page, siteLabel);

  const continueButton = page.getByRole('button', {
    name: /^(continue|allow|i agree)$/i,
  }).first();

  try {
    await continueButton.waitFor({ state: 'visible', timeout: 4_000 });
    await continueButton.click();
  } catch {
    // Consent is optional when the app is already approved.
  }

  try {
    await page.waitForURL(url => isFirstPartyUrl(String(url)), { timeout: 45_000 });
  } catch {
    await throwIfGoogleBlocked(page, siteLabel);
    throw new Error(
      `${siteLabel} Google sign-in did not return to nation.dev. Captcha or MFA likely blocked the unattended flow.`
    );
  }
}

async function completeFirstPartyLogin(
  page: Page,
  credentials: SiteCredentials,
  siteLabel: string
): Promise<void> {
  await assertLoginNotBlocked(page, siteLabel);

  /*
   * Generic first-party email/password fallback for sites
   * that do not authenticate through Google SSO.
   */
  const signInWithEmail = page
    .getByRole('button', { name: /^sign in with email$/i })
    .first();

  if (await signInWithEmail.isVisible().catch(() => false)) {
    await signInWithEmail.click();
  }

  const email = page
    .getByRole('textbox', { name: /email/i })
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"]'))
    .first();

  await email.waitFor({
    state: 'visible',
    timeout: 20_000,
  });

  await fillQuietly(email, credentials.email.trim());


  const password = visiblePasswordField(page);

  /*
   * Support email-first forms where password appears
   * only after Continue / Next.
   */
  if (!(await password.isVisible().catch(() => false))) {
    const continueButton = page
      .getByRole('button', {
        name: /^(continue|next|sign in|log in)$/i,
      })
      .filter({ hasNotText: /google/i })
      .first();

    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();

    }
  }

  await password.waitFor({
    state: 'visible',
    timeout: 20_000,
  });

  await fillQuietly(password, credentials.password);

  const passwordForm = page
  .locator('form')
  .filter({ has: password })
  .first();

let submit = passwordForm
  .getByRole('button', {
    name: /^(sign in|sign in with email|log in|continue)$/i,
  })
  .filter({ hasNotText: /google/i })
  .first();

if (!(await submit.isVisible().catch(() => false))) {
  submit = page
    .getByRole('button', {
      name: /^(sign in|sign in with email|log in|continue)$/i,
    })
    .filter({ hasNotText: /google/i })
    .first();
}

await submit.waitFor({
  state: 'visible',
  timeout: 20_000,
});

  await submit.click();

  await assertLoginNotBlocked(page, siteLabel);
}

export async function completeConfiguredLogin(
  page: Page,
  credentials: SiteCredentials,
  siteLabel: string
): Promise<void> {
  await page.waitForLoadState('domcontentloaded');

  /*
   * Nation and AI Skills authenticate through Google SSO.
   *
   * Provider selection is explicit instead of inferred from
   * visible email/password fields, because Google's own fields
   * would otherwise look like a first-party login form.
   */
  if (siteLabel === 'Nation' || siteLabel === 'AI Skills') {
    if (!isGoogleIdentityUrl(page.url())) {
      const googleButton = page
        .getByRole('button', {
          name: /continue with google|sign in with google/i,
        })
        .first();

      await googleButton.waitFor({
        state: 'visible',
        timeout: 20_000,
      });

      await googleButton.click();
    }

    await page.waitForURL(
      url => isGoogleIdentityUrl(String(url)),
      { timeout: 20_000 }
    );

    await completeGoogleIdentityLogin(
      page,
      credentials,
      siteLabel
    );

    return;
  }

  /*
   * Fallback for future sites that use first-party
   * email/password authentication.
   */
  await completeFirstPartyLogin(
    page,
    credentials,
    siteLabel
  );
}
