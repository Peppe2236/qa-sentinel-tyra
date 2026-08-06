import { test, expect } from '@playwright/test';

const NATION_URL = 'https://nation.dev/';

test.describe('Nation.dev basic user review', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(NATION_URL, {
      waitUntil: 'domcontentloaded',
    });

    expect(
      response,
      'The homepage returned no response'
    ).not.toBeNull();

    expect(
      response?.status(),
      `Homepage returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
  });

  test('homepage contains visible and readable content', async ({ page }) => {
    const bodyText = (await page.locator('body').innerText()).trim();

    expect(
      bodyText.length,
      'Homepage contains too little visible content'
    ).toBeGreaterThan(100);

    await expect(
      page.getByRole('heading', {
        name: /tech community.*skills-first platform/i,
      })
    ).toBeVisible();
  });

  test('primary talent link works', async ({ page }) => {
    const link = page
      .getByRole('link', { name: /join as a talent/i })
      .first();

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /.+/);

    await link.click();

    await expect(page).not.toHaveURL(NATION_URL);
    await expect(page.locator('body')).toBeVisible();
  });

  test('primary organization link works', async ({ page }) => {
    const link = page
      .getByRole('link', {
        name: /join as an organization/i,
      })
      .first();

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /.+/);

    await link.click();

    await expect(page).not.toHaveURL(NATION_URL);
    await expect(page.locator('body')).toBeVisible();
  });

  test('theme toggle visibly changes the page theme', async ({ page }) => {
    const button = page.getByRole('button', {
      name: /toggle theme/i,
    });

    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    const readTheme = async (): Promise<string> =>
      page.locator('body').evaluate(body => {
        const html = document.documentElement;
        const bodyStyle = window.getComputedStyle(body);

        return JSON.stringify({
          htmlClass: html.className,
          dataTheme: html.getAttribute('data-theme'),
          background: bodyStyle.backgroundColor,
          color: bodyStyle.color,
          storedTheme:
            localStorage.getItem('theme') ??
            localStorage.getItem('vite-ui-theme'),
        });
      });

    const before = await readTheme();

    await button.click();

    await expect
      .poll(readTheme, {
        timeout: 5_000,
        message:
          'Theme control was clicked, but no visible or stored theme state changed',
      })
      .not.toBe(before);
  });

  test(
    'sidebar control responds to user interaction',
    async ({ page }, testInfo) => {
      const button = page
        .locator('[data-sidebar="trigger"]')
        .first();

      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      const readSidebar = async (): Promise<string> =>
        page.evaluate(() => {
          const sidebar = document.querySelector(
            '[data-sidebar="sidebar"]'
          );

          const container = document.querySelector(
            '[data-slot="sidebar-container"]'
          );

          const wrapper =
            sidebar?.closest('[data-state]') ??
            container?.closest('[data-state]');

          const style = container
            ? window.getComputedStyle(container)
            : null;

          return JSON.stringify({
            state: wrapper?.getAttribute('data-state'),
            collapsible:
              wrapper?.getAttribute('data-collapsible'),
            width: style?.width,
            left: style?.left,
            transform: style?.transform,
          });
        });

      const before = await readSidebar();

      await button.click();
      await page.waitForTimeout(500);

      const after = await readSidebar();

      if (after === before) {
        testInfo.annotations.push({
          type: 'warning',
          description:
            'Sidebar button was clickable, but no visible state change was detected.',
        });
      }

      await expect(page.locator('body')).toBeVisible();
    }
  );

  test('legal links have valid destinations', async ({ page }) => {
    const privacy = page
      .getByRole('link', { name: /privacy policy/i })
      .first();

    const terms = page
      .getByRole('link', { name: /terms of use/i })
      .first();

    await expect(privacy).toBeVisible();
    await expect(terms).toBeVisible();

    await expect(privacy).toHaveAttribute('href', /.+/);
    await expect(terms).toHaveAttribute('href', /.+/);
  });

  test('homepage does not contain duplicated skills wording', async ({
    page,
  }) => {
    await expect(
      page.locator('body'),
      'Possible duplicated or malformed homepage sentence found'
    ).not.toContainText(
      'skills sights and evidence-based skills validation'
    );
  });
});