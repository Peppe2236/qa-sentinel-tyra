import { test, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import { AI_SKILLS_AUTH_STATE } from '../helpers/auth-state';
import { qualityMeta } from '../helpers/quality';
import { SKILLS_ORIGIN } from '../pages/skills-catalog.page';
import { dismissFirstPartyChallenges } from '../helpers/first-party-challenges';

const SKIP_LOGIN =
  'Set AI_SKILLS_TEST_EMAIL and AI_SKILLS_TEST_PASSWORD in .env to enable real Skills login.';

const MEMBER_ROUTES = [
  {
    path: '/assessment',
    criterion: 'AC-SKILLS-AUTH-001-LOGIN',
  },
] as const;

test.use({ storageState: AI_SKILLS_AUTH_STATE });

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

      await page.goto(`${SKILLS_ORIGIN}/assessment`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissFirstPartyChallenges(page);
      await expect(page).not.toHaveURL(/\/signin/i);
      await expect(page.locator('body')).toBeVisible();
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
        await dismissFirstPartyChallenges(page);

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
