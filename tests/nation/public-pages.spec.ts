import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import { NationPublicPage } from '../pages/nation-public.page';

test.describe('Nation.dev public content pages', () => {
  test(
    'manifesto page loads with visible content',
    qualityMeta({
      requirement: 'REQ-NATION-PUBLIC-001',
      criteria: 'AC-NATION-PUBLIC-001-MANIFESTO',
      flow: 'FLOW-NATION-PUBLIC-PAGES',
      scenario: 'SCN-NATION-PUBLIC-MARKETING',
      category: 'content',
      dimensions: ['requirements-functionality', 'ux-ui'],
    }),
    async ({ page }) => {
      const publicPage = new NationPublicPage(page);

      await publicPage.goto('/manifesto');
      await expect(page).toHaveURL(/\/manifesto/i);
      expect(
        (await publicPage.visibleText()).length,
        '/manifesto contains too little visible content'
      ).toBeGreaterThan(40);
    }
  );

  test(
    'made-with-sweden page loads with visible content',
    qualityMeta({
      requirement: 'REQ-NATION-PUBLIC-001',
      criteria: 'AC-NATION-PUBLIC-001-SWEDEN',
      flow: 'FLOW-NATION-PUBLIC-PAGES',
      scenario: 'SCN-NATION-PUBLIC-MARKETING',
      category: 'content',
      dimensions: ['requirements-functionality', 'ux-ui'],
    }),
    async ({ page }) => {
      const publicPage = new NationPublicPage(page);

      await publicPage.goto('/made-with-sweden');
      await expect(page).toHaveURL(/made-with-sweden/i);
      expect(
        (await publicPage.visibleText()).length,
        '/made-with-sweden contains too little visible content'
      ).toBeGreaterThan(40);
    }
  );

  test(
    'partner-join page loads with visible content',
    qualityMeta({
      requirement: 'REQ-NATION-PUBLIC-001',
      criteria: 'AC-NATION-PUBLIC-001-PARTNER',
      flow: 'FLOW-NATION-PUBLIC-PAGES',
      scenario: 'SCN-NATION-PUBLIC-MARKETING',
      category: 'content',
      dimensions: ['requirements-functionality', 'ux-ui'],
    }),
    async ({ page }) => {
      const publicPage = new NationPublicPage(page);

      await publicPage.goto('/partner-join');
      await expect(page).toHaveURL(/partner-join/i);
      expect(
        (await publicPage.visibleText()).length,
        '/partner-join contains too little visible content'
      ).toBeGreaterThan(20);
    }
  );

  test(
    'privacy policy page loads',
    qualityMeta({
      requirement: 'REQ-NATION-LEGAL-001',
      criteria: 'AC-NATION-LEGAL-001-PRIVACY',
      flow: 'FLOW-NATION-PUBLIC-PAGES',
      scenario: 'SCN-NATION-LEGAL-PAGES',
      category: 'content',
      dimensions: ['requirements-functionality', 'ux-ui'],
    }),
    async ({ page }) => {
      const publicPage = new NationPublicPage(page);

      await publicPage.goto('/privacy');
      await expect(page).toHaveURL(/privacy/i);
      expect(
        (await publicPage.visibleText()).length,
        '/privacy contains too little visible content'
      ).toBeGreaterThan(40);
    }
  );

  test(
    'terms of use page loads',
    qualityMeta({
      requirement: 'REQ-NATION-LEGAL-001',
      criteria: 'AC-NATION-LEGAL-001-TERMS',
      flow: 'FLOW-NATION-PUBLIC-PAGES',
      scenario: 'SCN-NATION-LEGAL-PAGES',
      category: 'content',
      dimensions: ['requirements-functionality', 'ux-ui'],
    }),
    async ({ page }) => {
      const publicPage = new NationPublicPage(page);

      await publicPage.goto('/terms');
      await expect(page).toHaveURL(/terms/i);
      expect(
        (await publicPage.visibleText()).length,
        '/terms contains too little visible content'
      ).toBeGreaterThan(40);
    }
  );
});
