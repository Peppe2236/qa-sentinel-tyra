import { expect, test } from '@playwright/test';

import { axeFailSeverity } from '../../reporters/utils/axe-classification';
import { scanPageAxe } from '../helpers/axe-smoke';
import { qualityMeta } from '../helpers/quality';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';

test.describe('AI Skills catalog accessibility smoke', () => {
  test(
    'catalog axe-core serious and critical findings',
    qualityMeta({
      requirement: 'REQ-SKILLS-A11Y-001',
      criteria: 'AC-SKILLS-A11Y-001-AXE',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-A11Y',
      category: 'accessibility',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();

      const scan = await scanPageAxe(page);

      if (scan.warnings.length > 0) {
        test.info().annotations.push({
          type: 'warning',
          description: scan.warningText,
        });
      }

      if (scan.failing.length > 0) {
        test.info().annotations.push({
          type: 'severity',
          description: axeFailSeverity(scan.failing),
        });
      }

      expect(scan.failing, scan.failingText).toEqual([]);
    }
  );
});
