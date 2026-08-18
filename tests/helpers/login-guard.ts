import type { Page } from '@playwright/test';

import { handleFirstPartyCaptcha } from './first-party-challenges';

const MFA_COPY =
  /two[- ]factor|authenticator app|verification code|enter (the|your) code/i;

export async function assertLoginNotBlocked(
  page: Page,
  siteLabel: string
): Promise<void> {
  const captcha = await handleFirstPartyCaptcha(page);

  if (captcha.blocked) {
    throw new Error(
      `${siteLabel} login blocked by ${captcha.kind} captcha; SENTINEL_CAPTCHA_SOLVER_KEY is not set.`
    );
  }

  const mfa = page.getByText(MFA_COPY).first();

  if (await mfa.isVisible().catch(() => false)) {
    throw new Error(
      `${siteLabel} login blocked by MFA; unattended member tests cannot continue.`
    );
  }
}
