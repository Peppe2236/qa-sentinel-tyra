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
  return page.getByRole('button', { name: /^next$/i }).first();
}

export function isGoogleIdentityUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'accounts.google.com' || host.endsWith('.google.com');
  } catch {
    return false;
  }
}

async function fillQuietly(locator: Locator, value: string): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: 20_000 });
  await locator.click();
  await locator.press('ControlOrMeta+A');
  await locator.press('Backspace');
  await locator.pressSequentially(value, { delay: 20 });
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
    await fillQuietly(identifier, credentials.email);
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

  const email = page.getByRole('textbox', { name: /email/i }).first();
  const password = visiblePasswordField(page);
  const submit = page
    .getByRole('button', { name: /sign in|log in/i })
    .first();

  await fillQuietly(email, credentials.email);
  await fillQuietly(password, credentials.password);
  await submit.click();
  await assertLoginNotBlocked(page, siteLabel);
}

export async function completeConfiguredLogin(
  page: Page,
  credentials: SiteCredentials,
  siteLabel: string
): Promise<void> {
  await page.waitForLoadState('domcontentloaded');

  const google = googleIdentifierField(page);
  const firstPartyPassword = visiblePasswordField(page);

  await Promise.race([
    google.waitFor({ state: 'visible', timeout: 20_000 }),
    firstPartyPassword.waitFor({ state: 'visible', timeout: 20_000 }),
    page.waitForURL(url => isGoogleIdentityUrl(String(url)), { timeout: 20_000 }),
  ]).catch(() => undefined);

  if (
    isGoogleIdentityUrl(page.url()) ||
    (await google.isVisible().catch(() => false))
  ) {
    await completeGoogleIdentityLogin(page, credentials, siteLabel);
    return;
  }

  await completeFirstPartyLogin(page, credentials, siteLabel);
}
