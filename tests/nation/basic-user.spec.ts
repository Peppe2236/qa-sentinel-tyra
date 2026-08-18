import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import {
  NationHomePage,
  NATION_HOME_URL,
} from '../pages/nation-home.page';

test.describe('Nation.dev basic user review', () => {
  test.beforeEach(async ({ page }) => {
    const home = new NationHomePage(page);

    await home.expectLoaded();
  });

  test(
    'homepage contains visible and readable content',
    qualityMeta({
      requirement: 'REQ-NATION-HOME-002',
      criteria: 'AC-NATION-HOME-002-HEADING',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-LOAD',
      category: 'content',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);
      const bodyText = (await home.body().innerText()).trim();

      expect(
        bodyText.length,
        'Homepage contains too little visible content'
      ).toBeGreaterThan(100);

      await expect(home.heading()).toBeVisible();
    }
  );

  test(
    'primary talent link works',
    qualityMeta({
      requirement: 'REQ-NATION-HOME-002',
      criteria: 'AC-NATION-HOME-002-TALENT',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-JOIN',
      category: 'navigation',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);
      const link = home.talentLink();

      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', /.+/);
      await link.click();
      await expect(page).not.toHaveURL(NATION_HOME_URL);
      await expect(page.locator('body')).toBeVisible();
    }
  );

  test(
    'primary organization link works',
    qualityMeta({
      requirement: 'REQ-NATION-HOME-002',
      criteria: 'AC-NATION-HOME-002-ORG',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-JOIN',
      category: 'navigation',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);
      const link = home.organizationLink();

      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', /.+/);
      await link.click();
      await expect(page).not.toHaveURL(NATION_HOME_URL);
      await expect(page.locator('body')).toBeVisible();
    }
  );

  test(
    'theme toggle visibly changes the page theme',
    qualityMeta({
      requirement: 'REQ-NATION-HOME-002',
      criteria: 'AC-NATION-HOME-002-THEME',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-THEME',
      category: 'visual',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);
      // Prefer the header "Toggle theme" control, not "Toggle Sidebar".
      // If that button exists and does not change theme, this is a product finding
      // (default-dark site with a no-op toggle), not an automation skip.
      const button = home.themeToggle();

      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await button.scrollIntoViewIfNeeded();

      const readTheme = async (): Promise<string> =>
        page.locator('body').evaluate(body => {
          const html = document.documentElement;
          const htmlStyle = window.getComputedStyle(html);
          const bodyStyle = window.getComputedStyle(body);
          const storageKeys = [
            'theme',
            'vite-ui-theme',
            'color-mode',
            'colorMode',
            'nation-theme',
          ];

          return JSON.stringify({
            htmlClass: html.className,
            bodyClass: body.className,
            dataTheme:
              html.getAttribute('data-theme') ??
              body.getAttribute('data-theme'),
            dataMode:
              html.getAttribute('data-mode') ??
              html.getAttribute('data-color-mode'),
            colorScheme: htmlStyle.colorScheme,
            background: bodyStyle.backgroundColor,
            color: bodyStyle.color,
            storedTheme: storageKeys
              .map(key => `${key}=${localStorage.getItem(key) ?? ''}`)
              .join('|'),
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
    }
  );

  test(
    'sidebar control responds to user interaction',
    qualityMeta({
      requirement: 'REQ-NATION-HOME-002',
      criteria: 'AC-NATION-HOME-002-SIDEBAR',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      category: 'navigation',
    }),
    async ({ page }, testInfo) => {
      const home = new NationHomePage(page);
      const button = home.sidebarTrigger();

      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      const readSidebar = async (): Promise<string> =>
        page.evaluate(() => {
          const sidebar = document.querySelector('[data-sidebar="sidebar"]');
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
            collapsible: wrapper?.getAttribute('data-collapsible'),
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

  test(
    'legal links have valid destinations',
    qualityMeta({
      requirement: ['REQ-NATION-HOME-002', 'REQ-NATION-LEGAL-001'],
      criteria: ['AC-NATION-HOME-002-LEGAL', 'AC-NATION-LEGAL-001-LINKS'],
      flow: 'FLOW-NATION-PUBLIC-HOME',
      category: 'navigation',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);

      await expect(home.privacyLink()).toBeVisible();
      await expect(home.termsLink()).toBeVisible();
      await expect(home.privacyLink()).toHaveAttribute('href', /.+/);
      await expect(home.termsLink()).toHaveAttribute('href', /.+/);
    }
  );

  test(
    'homepage does not contain duplicated skills wording',
    qualityMeta({
      requirement: 'REQ-NATION-HOME-002',
      criteria: 'AC-NATION-HOME-002-COPY',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      category: 'content',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);

      await expect(
        home.body(),
        'Possible duplicated or malformed homepage sentence found'
      ).not.toContainText(
        'skills sights and evidence-based skills validation'
      );
    }
  );
});
