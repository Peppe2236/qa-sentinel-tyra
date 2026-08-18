import { test, expect } from '@playwright/test';
import { readOptionalCredentials } from '../helpers/env';
import { NATION_AUTH_STATE } from '../helpers/auth-state';
import { qualityMeta } from '../helpers/quality';
import { NATION_ORIGIN } from '../pages/nation-auth.page';

const SKIP_LOGIN =
  'Set NATION_TEST_EMAIL and NATION_TEST_PASSWORD in .env to enable real login.';

const PROTECTED_ROUTES = [
  {
    path: '/home',
    criterion: 'AC-NATION-PROTECTED-001-HOME',
  },
  {
    path: '/jobs',
    criterion: 'AC-NATION-PROTECTED-001-JOBS',
  },
  {
    path: '/profile',
    criterion: 'AC-NATION-PROTECTED-001-PROFILE',
  },
] as const;

test.use({ storageState: NATION_AUTH_STATE });

test.describe('Nation authenticated session', () => {
  test(
    'can reuse configured Nation storageState',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-005',
      criteria: 'AC-NATION-AUTH-005-LOGIN',
      flow: 'FLOW-NATION-AUTHENTICATED-SESSION',
      scenario: 'SCN-NATION-SESSION-LOGIN',
      category: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('nation');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${NATION_ORIGIN}/home`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    }
  );

  for (const route of PROTECTED_ROUTES) {
    test(
      `authenticated session can open ${route.path}`,
      qualityMeta({
        requirement: 'REQ-NATION-PROTECTED-001',
        criteria: route.criterion,
        flow: 'FLOW-NATION-AUTHENTICATED-SESSION',
        scenario: 'SCN-NATION-SESSION-PROTECTED',
        category: 'authentication',
      }),
      async ({ page }) => {
        const credentials = readOptionalCredentials('nation');

        test.skip(!credentials, SKIP_LOGIN);

        const response = await page.goto(`${NATION_ORIGIN}${route.path}`, {
          waitUntil: 'domcontentloaded',
        });

        expect(
          response,
          `${route.path} returned no main response`
        ).not.toBeNull();
        expect(
          response?.status(),
          `${route.path} returned HTTP ${response?.status()}`
        ).toBeLessThan(400);
        await expect(page).not.toHaveURL(/\/signin/i);
        await expect(page.locator('body')).toBeVisible();
      }
    );
  }
});
