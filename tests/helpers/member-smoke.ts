import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

import { dismissFirstPartyChallenges } from './first-party-challenges';

const SERVER_ERROR_COPY =
  /internal server error|\bhttp\s*500\b|application error|uncaught exception|stack trace/i;

const LANDMARK_SELECTOR = [
  'header',
  'nav',
  'main',
  'aside',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="main"]',
  '[data-sidebar]',
].join(', ');

export function logoutControl(page: Page): Locator {
  return page
    .getByRole('button', { name: /sign out|log out|logout/i })
    .or(page.getByRole('link', { name: /sign out|log out|logout/i }))
    .first();
}

export function accountMenuControl(page: Page): Locator {
  return page
    .getByRole('button', {
      name: /account|profile|user menu|open user|avatar/i,
    })
    .or(page.getByRole('link', { name: /account|profile/i }))
    .first();
}

export async function expectAuthenticatedMemberPage(
  page: Page,
  response: Response | null,
  path: string
): Promise<void> {
  expect(response, `${path} returned no main response`).not.toBeNull();

  const status = response!.status();

  expect(status, `${path} returned HTTP ${status}`).toBeLessThan(400);

  await dismissFirstPartyChallenges(page);
  await expect(page, `${path} bounced to sign-in`).not.toHaveURL(/\/signin/i);
  await expect(page.locator('body')).toBeVisible();

  const text = (await page.locator('body').innerText()).trim();

  expect(text, `${path} rendered server-error copy`).not.toMatch(
    SERVER_ERROR_COPY
  );

  const landmark = page.locator(LANDMARK_SELECTOR).first();
  const heading = page.getByRole('heading').first();
  const landmarkVisible = await landmark.isVisible().catch(() => false);
  const headingVisible = await heading.isVisible().catch(() => false);

  expect(
    landmarkVisible || headingVisible,
    `${path} had no banner/navigation/main landmark or heading`
  ).toBe(true);
}

export async function clearBrowserSession(page: Page): Promise<void> {
  await page.context().clearCookies();

  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage can be blocked on a blank origin.
    }
  }).catch(() => {
    // Ignore if the page cannot access storage yet.
  });
}
