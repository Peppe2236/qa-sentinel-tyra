import { expect, test } from '@playwright/test';

import { axeFailSeverity } from '../../reporters/utils/axe-classification';
import { scanPageAxe } from '../helpers/axe-smoke';
import { qualityMeta } from '../helpers/quality';
import { NationHomePage } from '../pages/nation-home.page';

test.describe('Nation homepage accessibility smoke', () => {
  test(
    'homepage axe-core serious and critical findings',
    qualityMeta({
      requirement: 'REQ-NATION-A11Y-001',
      criteria: 'AC-NATION-A11Y-001-AXE',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-A11Y',
      category: 'accessibility',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);

      await home.goto();

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
