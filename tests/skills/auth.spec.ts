import { test, expect } from '@playwright/test';
import { readOptionalCredentials } from '../helpers/env';
import { qualityMeta } from '../helpers/quality';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';

test.describe('AI Skills authentication', () => {
  test(
    'sign-in page exposes a usable login form',
    qualityMeta({
      requirement: 'REQ-SKILLS-AUTH-001',
      criteria: 'AC-SKILLS-AUTH-001-FORM',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-FORM',
      category: 'authentication',
      dimensions: [
        'requirements-functionality',
        'critical-flows',
        'security-performance',
        'ux-ui',
      ],
      securityCheck: 'authentication',
    }),
    async ({ page }) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.gotoPath('/signin');
      await expect(page).toHaveURL(/\/signin/i);
      await expect(catalog.emailField()).toBeVisible();
      await expect(catalog.emailField()).toBeEditable();
      await expect(catalog.passwordField()).toBeVisible();
      await expect(catalog.passwordField()).toBeEditable();
      await expect(catalog.signInSubmit()).toBeVisible();
      await expect(catalog.signInSubmit()).toBeEnabled();
    }
  );

  test(
    'can sign in with configured AI Skills test account',
    qualityMeta({
      requirement: 'REQ-SKILLS-AUTH-001',
      criteria: 'AC-SKILLS-AUTH-001-LOGIN',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-LOGIN',
      category: 'authentication',
      dimensions: [
        'requirements-functionality',
        'critical-flows',
        'security-performance',
        'ux-ui',
      ],
      securityCheck: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('ai-skills');

      test.skip(
        !credentials,
        'Set AI_SKILLS_TEST_EMAIL and AI_SKILLS_TEST_PASSWORD in .env to enable real Skills login.'
      );

      const catalog = new SkillsCatalogPage(page);

      await catalog.gotoPath('/signin');
      await catalog.emailField().fill(credentials!.email);
      await catalog.passwordField().fill(credentials!.password);
      await catalog.signInSubmit().click();
      await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    }
  );
});
