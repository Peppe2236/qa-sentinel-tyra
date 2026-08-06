import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'https://nation.dev';

async function expectSuccessfulPageLoad(
  page: Page,
  route: string
): Promise<void> {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: 'domcontentloaded',
  });

  expect(
    response,
    `${route} returned no main response`
  ).not.toBeNull();

  expect(
    response?.status(),
    `${route} returned HTTP ${response?.status()}`
  ).toBeLessThan(400);

  await expect(page.locator('body')).toBeVisible();
}

test.describe('Nation.dev authentication pages', () => {
  test('sign-in page loads and contains a usable form', async ({ page }) => {
    await expectSuccessfulPageLoad(page, '/signin');

    await expect(
      page.getByRole('heading', { name: /sign in/i }).first()
    ).toBeVisible();

    const emailField = page
      .getByRole('textbox', { name: /email/i })
      .first();

    const passwordField = page
      .locator('input[type="password"]')
      .first();

    await expect(emailField).toBeVisible();
    await expect(emailField).toBeEditable();

    await expect(passwordField).toBeVisible();
    await expect(passwordField).toBeEditable();

    const submitButton = page
      .getByRole('button', { name: /sign in|log in/i })
      .first();

    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('sign-in form accepts user input', async ({ page }) => {
    await expectSuccessfulPageLoad(page, '/signin');

    const emailField = page
      .getByRole('textbox', { name: /email/i })
      .first();

    const passwordField = page
      .locator('input[type="password"]')
      .first();

    await emailField.fill('qa-test@example.com');
    await passwordField.fill('SafeTestPassword123!');

    await expect(emailField).toHaveValue('qa-test@example.com');
    await expect(passwordField).toHaveValue('SafeTestPassword123!');
  });

  test('forgot-password link from sign-in works', async ({ page }) => {
    await expectSuccessfulPageLoad(page, '/signin');

    const forgotPasswordLink = page
      .getByRole('link', {
        name: /forgot.*password|reset.*password/i,
      })
      .first();

    await expect(forgotPasswordLink).toBeVisible();

    await forgotPasswordLink.click();

    await expect(page).toHaveURL(/forgot-password/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('forgot-password page has an email field and submit control', async ({
    page,
  }) => {
    await expectSuccessfulPageLoad(page, '/forgot-password');

    const emailField = page
      .getByRole('textbox', { name: /email/i })
      .first();

    await expect(emailField).toBeVisible();
    await expect(emailField).toBeEditable();

    const submitControl = page
      .getByRole('button', {
        name: /reset|send|continue|submit/i,
      })
      .first();

    await expect(
      submitControl,
      'Password-reset submit control was not found'
    ).toBeVisible();
  });

  test('sign-up page loads and exposes registration controls', async ({
    page,
  }) => {
    await expectSuccessfulPageLoad(page, '/signup');

    await expect(
      page
        .getByRole('heading', {
          name: /sign up|create.*account|join/i,
        })
        .first()
    ).toBeVisible();

    const inputs = page.locator('input:visible');

    expect(
      await inputs.count(),
      'No visible registration inputs were found'
    ).toBeGreaterThan(0);

    const submitButton = page
      .getByRole('button', {
        name: /sign up|create.*account|continue|register/i,
      })
      .first();

    await expect(
      submitButton,
      'Registration submit control was not found'
    ).toBeVisible();
  });

  test('authentication pages do not expose raw runtime errors', async ({
    page,
  }) => {
    const routes = ['/signin', '/signup', '/forgot-password'];

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
      await expectSuccessfulPageLoad(page, route);

      const visibleText = await page.locator('body').innerText();

      for (const pattern of forbiddenErrorText) {
        expect(
          visibleText,
          `Raw runtime error found on ${route}: ${pattern}`
        ).not.toMatch(pattern);
      }
    }
  });
});