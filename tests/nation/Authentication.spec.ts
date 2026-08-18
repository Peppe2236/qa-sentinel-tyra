import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import { NationAuthPage } from '../pages/nation-auth.page';

test.describe('Nation.dev authentication pages', () => {
  test(
    'sign-in page loads and contains a usable form',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-001',
      criteria: ['AC-NATION-AUTH-001-LOAD', 'AC-NATION-AUTH-001-FORM'],
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-FORM',
      category: 'authentication',
      tag: '@compat',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/signin');
      await expect(page).toHaveURL(/\/signin/i);
      await expect(page).toHaveTitle(/sign in|welcome back/i);
      await expect(auth.emailField()).toBeVisible();
      await expect(auth.emailField()).toBeEditable();
      await expect(auth.passwordField()).toBeVisible();
      await expect(auth.passwordField()).toBeEditable();
      await expect(auth.signInSubmit()).toBeVisible();
      await expect(auth.signInSubmit()).toBeEnabled();
    }
  );

  test(
    'sign-in form accepts user input',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-001',
      criteria: 'AC-NATION-AUTH-001-INPUT',
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-INPUT',
      category: 'authentication',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/signin');
      await auth.emailField().fill('qa-test@example.com');
      await auth.passwordField().fill('SafeTestPassword123!');
      await expect(auth.emailField()).toHaveValue('qa-test@example.com');
      await expect(auth.passwordField()).toHaveValue('SafeTestPassword123!');
    }
  );

  test(
    'forgot-password link from sign-in works',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-001',
      criteria: 'AC-NATION-AUTH-001-FORGOT',
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-FORGOT',
      category: 'authentication',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/signin');
      await expect(auth.forgotPasswordLink()).toBeVisible();
      await auth.forgotPasswordLink().click();
      await expect(page).toHaveURL(/forgot-password/i);
      await expect(page.locator('body')).toBeVisible();
    }
  );

  test(
    'forgot-password page has an email field and submit control',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-002',
      criteria: ['AC-NATION-AUTH-002-EMAIL', 'AC-NATION-AUTH-002-SUBMIT'],
      flow: 'FLOW-NATION-RESET-PASSWORD',
      scenario: 'SCN-NATION-RESET-FORM',
      category: 'authentication',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/forgot-password');
      await expect(auth.emailField()).toBeVisible();
      await expect(auth.emailField()).toBeEditable();
      await expect(
        auth.passwordResetSubmit(),
        'Password-reset submit control was not found'
      ).toBeVisible();
    }
  );

  test(
    'sign-up page loads and exposes registration controls',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-003',
      criteria: ['AC-NATION-AUTH-003-LOAD', 'AC-NATION-AUTH-003-CONTROLS'],
      flow: 'FLOW-NATION-SIGNUP',
      scenario: 'SCN-NATION-SIGNUP-FORM',
      category: 'authentication',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/signup');
      await expect(auth.signUpHeading()).toBeVisible();
      expect(
        await auth.visibleInputs().count(),
        'No visible registration inputs were found'
      ).toBeGreaterThan(0);
      await expect(
        auth.signUpSubmit(),
        'Registration submit control was not found'
      ).toBeVisible();
    }
  );

  test(
    'authentication pages do not expose raw runtime errors',
    qualityMeta({
      requirement: 'REQ-NATION-AUTH-004',
      criteria: 'AC-NATION-AUTH-004-NO-ERRORS',
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-NO-STACK',
      category: 'javascript',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);
      const routes = ['/signin', '/signup', '/forgot-password'] as const;
      const forbiddenErrorText = [
        /typeerror/i,
        /referenceerror/i,
        /syntaxerror/i,
        /uncaught exception/i,
        /internal server error/i,
        /application error/i,
        /stack trace/i,
      ];

      for (const route of routes) {
        await auth.goto(route);
        const visibleText = await auth.bodyText();

        for (const pattern of forbiddenErrorText) {
          expect(
            visibleText,
            `Raw runtime error found on ${route}: ${pattern}`
          ).not.toMatch(pattern);
        }
      }
    }
  );

  test(
    'invalid credentials stay on sign-in without a raw runtime error',
    qualityMeta({
      requirement: ['REQ-NATION-AUTH-001', 'REQ-NATION-AUTH-004'],
      criteria: ['AC-NATION-AUTH-001-FORM', 'AC-NATION-AUTH-004-NO-ERRORS'],
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-REJECT',
      category: 'authentication',
    }),
    async ({ page }) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/signin');
      await auth.emailField().fill('qa-invalid@example.com');
      await auth.passwordField().fill('WrongPassword!123');
      await auth.signInSubmit().click();
      await expect(page).toHaveURL(/\/signin/i, { timeout: 15_000 });

      const visibleText = await auth.bodyText();

      expect(
        visibleText,
        'Invalid sign-in exposed a raw runtime error'
      ).not.toMatch(
        /typeerror|referenceerror|syntaxerror|uncaught exception|internal server error|application error|stack trace/i
      );
    }
  );
});
