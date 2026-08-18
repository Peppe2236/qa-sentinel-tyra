import { test, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import { AI_SKILLS_AUTH_STATE } from '../helpers/auth-state';
import { qualityMeta } from '../helpers/quality';
import { SKILLS_ORIGIN } from '../pages/skills-catalog.page';
import { dismissFirstPartyChallenges } from '../helpers/first-party-challenges';
import {
  accountMenuControl,
  clearBrowserSession,
  expectAuthenticatedMemberPage,
  logoutControl,
} from '../helpers/member-smoke';
import {
  assessStoredSessionCookies,
  isLikelySessionCookie,
} from '../../reporters/utils/http-security';

const SKIP_LOGIN =
  'Set AI_SKILLS_TEST_EMAIL and AI_SKILLS_TEST_PASSWORD in .env to enable real Skills login.';

const MEMBER_ROUTES = [
  {
    path: '/skills',
    criterion: 'AC-SKILLS-AUTH-001-CATALOG',
  },
  {
    path: '/assessment',
    criterion: 'AC-SKILLS-AUTH-001-LOGIN',
  },
] as const;

test.use({ storageState: AI_SKILLS_AUTH_STATE });
test.describe.configure({ timeout: 90_000 });

test.describe('AI Skills authenticated session', () => {
  test(
    'can reuse configured Skills storageState',
    qualityMeta({
      requirement: 'REQ-SKILLS-AUTH-001',
      criteria: 'AC-SKILLS-AUTH-001-LOGIN',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-LOGIN',
      category: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('ai-skills');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${SKILLS_ORIGIN}/skills`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i);
      await expect(page.locator('body')).toBeVisible();
    }
  );

  test(
    'session cookies set Secure, HttpOnly and SameSite after login',
    qualityMeta({
      requirement: ['REQ-SKILLS-AUTH-001', 'REQ-SKILLS-SEC-001'],
      criteria: ['AC-SKILLS-AUTH-001-COOKIES', 'AC-SKILLS-SEC-001-COOKIES'],
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-LOGIN',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'session-cookies',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('ai-skills');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${SKILLS_ORIGIN}/skills`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i, { timeout: 15_000 });

      const cookies = (await page.context().cookies(SKILLS_ORIGIN)).map(
        cookie => ({
          name: cookie.name,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
        })
      );
      const finding = assessStoredSessionCookies('AI Skills session', cookies);

      expect(finding.passed, finding.message).toBe(true);
    }
  );

  for (const route of MEMBER_ROUTES) {
    test(
      `authenticated session can open ${route.path}`,
      qualityMeta({
        requirement: 'REQ-SKILLS-AUTH-001',
        criteria: route.criterion,
        flow: 'FLOW-SKILLS-AUTH',
        scenario: 'SCN-SKILLS-AUTH-LOGIN',
        category: 'authentication',
      }),
      async ({ page }) => {
        const credentials = readOptionalCredentials('ai-skills');

        test.skip(!credentials, SKIP_LOGIN);

        const response = await page.goto(`${SKILLS_ORIGIN}${route.path}`, {
          waitUntil: 'domcontentloaded',
        });

        await expectAuthenticatedMemberPage(page, response, route.path);

        if (route.path === '/assessment') {
          test.info().annotations.push({
            type: 'note',
            description:
              'Assessment is smoke-loaded only. Completing it would POST real answers in production.',
          });
        }
      }
    );
  }

  test(
    'cleared session returns a member route to sign-in',
    qualityMeta({
      requirement: 'REQ-SKILLS-AUTH-001',
      criteria: 'AC-SKILLS-AUTH-001-RECOVERY',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-RECOVERY',
      category: 'authentication',
      securityCheck: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('ai-skills');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${SKILLS_ORIGIN}/assessment`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i, { timeout: 15_000 });

      await clearBrowserSession(page);

      await page.goto(`${SKILLS_ORIGIN}/assessment`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);

      if (/\/signin/i.test(page.url())) {
        await expect(page).toHaveURL(/\/signin/i);
        return;
      }

      const remaining = (await page.context().cookies(SKILLS_ORIGIN)).filter(
        cookie =>
          isLikelySessionCookie({
            name: cookie.name,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
          })
      );

      expect(
        remaining.map(cookie => cookie.name),
        'Cleared Skills session still had session cookies on a public member route'
      ).toEqual([]);
    }
  );

  test(
    'logout control returns to sign-in when visible',
    qualityMeta({
      requirement: 'REQ-SKILLS-AUTH-001',
      criteria: 'AC-SKILLS-AUTH-001-RECOVERY',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-RECOVERY',
      category: 'authentication',
      securityCheck: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('ai-skills');

      test.skip(!credentials, SKIP_LOGIN);

      await page.goto(`${SKILLS_ORIGIN}/skills`, {
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
