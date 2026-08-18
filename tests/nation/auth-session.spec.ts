import { test, expect } from '@playwright/test';
import { readOptionalCredentials } from '../helpers/env';
import { qualityMeta } from '../helpers/quality';
import { NationAuthPage } from '../pages/nation-auth.page';

test.describe('Nation authenticated session', () => {
  test(
    'can sign in with configured test account',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-005',
      criteria: 'AC-NATION-AUTH-005-LOGIN',
      flow: 'FLOW-NATION-AUTHENTICATED-SESSION',
      scenario: 'SCN-NATION-SESSION-LOGIN',
      category: 'authentication',
    }),
    async ({ page }) => {
      const credentials = readOptionalCredentials('nation');

      test.skip(
        !credentials,
        'Set NATION_TEST_EMAIL and NATION_TEST_PASSWORD in .env to enable real login.'
      );

      const auth = new NationAuthPage(page);

      await auth.goto('/signin');
      await auth.emailField().fill(credentials!.email);
      await auth.passwordField().fill(credentials!.password);
      await auth.signInSubmit().click();
      await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    }
  );
});
