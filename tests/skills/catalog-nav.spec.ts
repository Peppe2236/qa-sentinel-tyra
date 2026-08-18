import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import { NAMED_SKILLS, SkillsCatalogPage } from '../pages/skills-catalog.page';

test.describe('AI Skills catalog navigation', () => {
  test(
    'catalog exposes learning or named-skill navigation',
    qualityMeta({
      requirement: 'REQ-SKILLS-HOME-001',
      criteria: 'AC-SKILLS-HOME-001-NAV',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-NAV',
      category: 'navigation',
      dimensions: ['requirements-functionality', 'ux-ui'],
    }),
    async ({ page }) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();

      const learningCount = await catalog.learningLinks().count();
      let namedCount = 0;

      for (const skill of NAMED_SKILLS) {
        namedCount += await catalog.namedSkillLink(skill).count();
      }

      expect(
        learningCount + namedCount,
        'Catalog has no visible learning or named-skill links'
      ).toBeGreaterThan(0);
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
      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();
      expect(page.url()).toMatch(/^https:/);
    }
  );
});
