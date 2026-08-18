import { expect, test } from '@playwright/test';

import { observePagePerformance, assertMeasuredPagePerformance } from '../helpers/observe-performance';
import { qualityMeta } from '../helpers/quality';
import { NATION_HOME_URL } from '../pages/nation-home.page';
import { NATION_ORIGIN } from '../pages/nation-auth.page';

const PAGES = [
  {
    name: 'homepage',
    url: NATION_HOME_URL,
    requirement: 'REQ-NATION-PERF-001',
    flow: 'FLOW-NATION-PUBLIC-HOME',
    scenario: 'SCN-NATION-HOME-PERF',
    criterion: 'AC-NATION-PERF-001-LOAD',
  },
  {
    name: 'sign-in',
    url: `${NATION_ORIGIN}/signin`,
    requirement: 'REQ-NATION-PERF-001',
    flow: 'FLOW-NATION-SIGNIN',
    scenario: 'SCN-NATION-SIGNIN-PERF',
    criterion: 'AC-NATION-PERF-001-LOAD',
  },
] as const;

test.describe('Nation public page load and API timing', () => {
  for (const target of PAGES) {
    test(
      `${target.name} page load and first-party API timing stay within catalog thresholds`,
      qualityMeta({
        requirement: target.requirement,
        criteria: target.criterion,
        flow: target.flow,
        scenario: target.scenario,
        category: 'performance',
        dimensions: 'security-performance',
        performanceCheck: ['page-load', 'api-latency'],
        severity: 'medium',
      }),
      async ({ page }, testInfo) => {
        const observed = await observePagePerformance(page, target.url);

        assertMeasuredPagePerformance(testInfo, target.name, observed);

        expect(page.url()).toMatch(/^https:/);
      }
    );
  }
});
