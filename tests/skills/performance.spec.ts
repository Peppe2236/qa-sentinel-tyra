import { expect, test } from '@playwright/test';

import { observePagePerformance, assertMeasuredPagePerformance } from '../helpers/observe-performance';
import { qualityMeta } from '../helpers/quality';
import { SKILLS_CATALOG_URL } from '../pages/skills-catalog.page';

test.describe('AI Skills public page load and API timing', () => {
  test(
    'catalog page load and first-party API timing stay within catalog thresholds',
    qualityMeta({
      requirement: 'REQ-SKILLS-PERF-001',
      criteria: 'AC-SKILLS-PERF-001-LOAD',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-PERF',
      category: 'performance',
      dimensions: 'security-performance',
      performanceCheck: ['page-load', 'api-latency'],
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const observed = await observePagePerformance(page, SKILLS_CATALOG_URL);

      assertMeasuredPagePerformance(testInfo, 'catalog', observed);

      expect(page.url()).toMatch(/^https:/);
    }
  );
});
