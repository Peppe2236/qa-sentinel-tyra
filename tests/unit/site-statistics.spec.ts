import { expect, test } from '@playwright/test';

import { buildSiteStatistics } from '../../reporters/analyzers/sentinel-site-statistics';
import type { DashboardTestResult } from '../../reporters/models/types';

function sample(status: string, site = 'nation'): DashboardTestResult {
  return {
    id: `${site}-${status}-${Math.random()}`,
    title: status,
    fullTitle: status,
    file: 'tests/nation/homepage.spec.ts',
    line: 1,
    column: 1,
    project: 'nation-chromium',
    site,
    browserFamily: 'Chromium',
    profile: 'Desktop',
    status,
    expectedStatus: 'passed',
    duration: 10,
    retry: 0,
    severity: 'medium',
    category: 'ui',
    vitalRank: 3,
    tags: [],
    annotations: [],
    attachments: [],
  };
}

test.describe('site statistics pass rate', () => {
  test('does not crush a mostly-passing site to 0%', () => {
    const tests = [
      ...Array.from({ length: 8 }, () => sample('passed')),
      ...Array.from({ length: 2 }, () => sample('failed')),
    ];
    const stats = buildSiteStatistics(tests);

    expect(stats.nation.passed).toBe(8);
    expect(stats.nation.failed).toBe(2);
    expect(stats.nation.passRate).toBe(80);
    expect(stats.nation.health).toBe(80);
  });
});
