import type { Page } from '@playwright/test';

import {
  classifyCaptchaEvidence,
  isFirstPartyUrl,
  type CaptchaChallengeKind,
} from '../../config/first-party';
import { captchaSolverKeyPresent } from '../../config/policy';
import type { CaptchaQueueItem } from '../../reporters/models/types';
import { recordCaptchaQueueItem } from '../../reporters/utils/captcha-queue';
import { trySolveFirstPartyCaptcha } from './captcha-solver';

const CONSENT_NAME =
  /accept all|allow all|accept|allow|i agree|got it|continue|ok|godkänn|acceptera|tillåt/i;

export interface ChallengeHandleResult {
  kind: CaptchaChallengeKind;
  blocked: boolean;
  queued: boolean;
  solverAttempted: boolean;
}

function siteFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('aiskills') ? 'ai-skills' : 'nation';
  } catch {
    return 'nation';
  }
}

async function iframeSrcs(page: Page): Promise<string[]> {
  const frames = page.frames();
  return frames
    .map(frame => frame.url())
    .filter(url => url && url !== 'about:blank');
}

async function hasConsentButton(page: Page): Promise<boolean> {
  const button = page.getByRole('button', { name: CONSENT_NAME }).first();
  return button.isVisible().catch(() => false);
}

async function hasNativeCheckbox(page: Page): Promise<boolean> {
  const labeled = page.getByRole('checkbox', {
    name: /not a robot|i am human|i'm not a robot/i,
  }).first();

  if (await labeled.isVisible().catch(() => false)) {
    const inIframe = await labeled.evaluate(node =>
      Boolean(node.closest('iframe'))
    ).catch(() => false);

    return !inIframe;
  }

  return false;
}

export async function dismissFirstPartyChallenges(
  page: Page
): Promise<ChallengeHandleResult> {
  const url = page.url();

  if (!isFirstPartyUrl(url)) {
    return {
      kind: 'third-party-blocked',
      blocked: false,
      queued: false,
      solverAttempted: false,
    };
  }

  const consent = page.getByRole('button', { name: CONSENT_NAME }).first();

  try {
    await consent.waitFor({ state: 'visible', timeout: 700 });
    await consent.click({ timeout: 1000 });
  } catch {
    // No banner, or it closed itself.
  }

  const native = page.getByRole('checkbox', {
    name: /not a robot|i am human|i'm not a robot/i,
  }).first();

  try {
    await native.waitFor({ state: 'visible', timeout: 400 });
    await native.check({ timeout: 1000 }).catch(async () => {
      await native.click({ timeout: 1000 });
    });
  } catch {
    // Native checkbox is optional.
  }

  const kind = classifyCaptchaEvidence({
    url,
    iframeSrcs: await iframeSrcs(page),
    hasNativeCheckbox: await hasNativeCheckbox(page),
    hasConsentButton: await hasConsentButton(page),
  });

  return {
    kind,
    blocked: false,
    queued: false,
    solverAttempted: false,
  };
}

async function detectAndHandleIframeCaptcha(
  page: Page
): Promise<ChallengeHandleResult> {
  const url = page.url();
  const kind = classifyCaptchaEvidence({
    url,
    iframeSrcs: await iframeSrcs(page),
    hasNativeCheckbox: await hasNativeCheckbox(page),
    hasConsentButton: await hasConsentButton(page),
  });

  if (kind !== 'recaptcha' && kind !== 'hcaptcha') {
    return {
      kind,
      blocked: false,
      queued: false,
      solverAttempted: false,
    };
  }

  const env = process.env;
  const solverOn = captchaSolverKeyPresent(env);

  if (solverOn) {
    const solved = await trySolveFirstPartyCaptcha(page, kind);

    if (solved) {
      return {
        kind,
        blocked: false,
        queued: false,
        solverAttempted: true,
      };
    }
  }

  await queueHumanCaptcha(page, kind, solverOn);

  return {
    kind,
    blocked: true,
    queued: true,
    solverAttempted: solverOn,
  };
}

export async function handleFirstPartyCaptcha(
  page: Page
): Promise<ChallengeHandleResult> {
  await dismissFirstPartyChallenges(page);
  return detectAndHandleIframeCaptcha(page);
}

export async function queueHumanCaptcha(
  page: Page,
  kind: 'recaptcha' | 'hcaptcha' | CaptchaChallengeKind,
  solverAttempted = false
): Promise<CaptchaQueueItem> {
  const url = page.url();
  const id = `gap-captcha-${kind}`;
  const screenshot = `reports/captcha-queue/${id}.png`;

  try {
    await page.screenshot({
      path: screenshot,
      fullPage: false,
    });
  } catch {
    // Screenshot is best-effort.
  }

  const item: CaptchaQueueItem = {
    id,
    site: siteFromUrl(url),
    url,
    kind: kind === 'hcaptcha' ? 'hcaptcha' : 'recaptcha',
    title: `Human captcha on first-party login (${kind})`,
    whyHuman:
      'A Google reCAPTCHA or hCaptcha iframe blocked login. Cookie banners are clicked unattended; iframe captchas stay queued unless SENTINEL_CAPTCHA_SOLVER_KEY is set for nation.dev / aiskills.nation.dev only.',
    screenshot: `../${screenshot.replaceAll('\\', '/')}`,
    solverAttempted,
  };

  recordCaptchaQueueItem(item);
  return item;
}
