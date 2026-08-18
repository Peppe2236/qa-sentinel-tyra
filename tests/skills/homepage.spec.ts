import { test, expect } from '@playwright/test';
import {
  attachDiagnostics,
  formatDiagnostics,
  type Diagnostics,
} from '../../utils/diagnostics';
import { qualityMeta } from '../helpers/quality';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';

test.describe('AI Skills page', () => {
  let diagnostics: Diagnostics;

  test.beforeEach(async ({ page }) => {
    diagnostics = attachDiagnostics(page);
    const catalog = new SkillsCatalogPage(page);

    await catalog.goto();
  });

  test(
    'page loads successfully',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-URL',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'availability',
    }),
    async ({ page }) => {
      await expect(page).toHaveURL(/aiskills\.nation\.dev\/skills/);
    }
  );

  test(
    'page has a non-empty title',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-TITLE',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'content',
    }),
    async ({ page }) => {
      expect(
        (await page.title()).trim(),
        'The HTML title is empty'
      ).not.toBe('');
    }
  );

  test(
    'page contains visible content',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-CONTENT',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'content',
    }),
    async ({ page }) => {
      const catalog = new SkillsCatalogPage(page);
      const text = (await catalog.body().innerText()).trim();

      expect(
        text.length,
        'The page contains too little visible text'
      ).toBeGreaterThan(20);
    }
  );

  test(
    'page has no unexpected JavaScript errors',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-JS',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'javascript',
    }),
    async () => {
      expect(
        diagnostics.consoleErrors,
        formatDiagnostics('Console errors', diagnostics.consoleErrors)
      ).toEqual([]);
    }
  );

  test(
    'page has no unexpected failed requests',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-NETWORK',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'network',
    }),
    async () => {
      expect(
        diagnostics.failedRequests,
        formatDiagnostics('Failed requests', diagnostics.failedRequests)
      ).toEqual([]);
    }
  );

  test(
    'page has no HTTP 4xx or 5xx responses',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-STATUS',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'http',
    }),
    async () => {
      expect(
        diagnostics.httpErrors,
        formatDiagnostics('HTTP errors', diagnostics.httpErrors)
      ).toEqual([]);
    }
  );

  test(
    'catalog is served over HTTPS',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-HTTPS',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-LOAD',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
    }),
    async ({ page }) => {
      expect(page.url()).toMatch(/^https:/);
    }
  );
});
