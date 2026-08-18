import { test, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import { NATION_AUTH_STATE } from '../helpers/auth-state';
import { qualityMeta } from '../helpers/quality';
import { NATION_ORIGIN } from '../pages/nation-auth.page';
import { dismissFirstPartyChallenges } from '../helpers/first-party-challenges';
import {
  accountMenuControl,
  clearBrowserSession,
  expectAuthenticatedMemberPage,
  logoutControl,
} from '../helpers/member-smoke';
import { assessStoredSessionCookies } from '../../reporters/utils/http-security';

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
test.describe.configure({ timeout: 90_000 });

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
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    }
  );

  test(
    'session cookies set Secure, HttpOnly and SameSite after login',
    qualityMeta({
      requirement: ['REQ-NATION-AUTH-005', 'REQ-NATION-SEC-001'],
      criteria: ['AC-NATION-AUTH-005-COOKIES', 'AC-NATION-SEC-001-COOKIES'],
      flow: 'FLOW-NATION-AUTHENTICATED-SESSION',
      scenario: 'SCN-NATION-SESSION-LOGIN',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'session-cookies',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('nation');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${NATION_ORIGIN}/home`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i, { timeout: 15_000 });

      const cookies = (await page.context().cookies(NATION_ORIGIN)).map(
        cookie => ({
          name: cookie.name,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
        })
      );
      const finding = assessStoredSessionCookies('Nation session', cookies);

      expect(finding.passed, finding.message).toBe(true);
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

        await expectAuthenticatedMemberPage(page, response, route.path);
      }
    );
  }

  test(
    'cleared session returns /home to sign-in',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-005',
      criteria: 'AC-NATION-AUTH-005-RECOVERY',
      flow: 'FLOW-NATION-AUTHENTICATED-SESSION',
      scenario: 'SCN-NATION-SESSION-RECOVERY',
      category: 'authentication',
      securityCheck: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('nation');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${NATION_ORIGIN}/home`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i, { timeout: 15_000 });

      await clearBrowserSession(page);

      await page.goto(`${NATION_ORIGIN}/home`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).toHaveURL(/\/signin/i, { timeout: 15_000 });
    }
  );

  test(
    'logout control returns to sign-in when visible',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-005',
      criteria: 'AC-NATION-AUTH-005-RECOVERY',
      flow: 'FLOW-NATION-AUTHENTICATED-SESSION',
      scenario: 'SCN-NATION-SESSION-RECOVERY',
      category: 'authentication',
      securityCheck: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('nation');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${NATION_ORIGIN}/home`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i, { timeout: 15_000 });

      const logout = logoutControl(page);

      if (!(await logout.isVisible().catch(() => false))) {
        const menu = accountMenuControl(page);

        if (await menu.isVisible().catch(() => false)) {
          await menu.click();
        }
      }

      if (!(await logout.isVisible().catch(() => false))) {
        test.info().annotations.push({
          type: 'note',
          description:
            'No visible logout control; recovery is covered by the cleared-session test.',
        });
        return;
      }

      await logout.click();
      await expect(page).toHaveURL(/\/signin/i, { timeout: 15_000 });
    }
  );
});
