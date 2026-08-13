import type {
  BrowserStats,
  CategoryStats,
  DashboardTestResult,
} from '../models/types';

export function browserFamily(projectName: string): string {
  const name = projectName.toLowerCase();

  if (name.includes('chrom')) return 'Chromium';
  if (name.includes('firefox')) return 'Firefox';
  if (name.includes('webkit') || name.includes('safari')) return 'WebKit';
  if (name.includes('tablet')) return 'Tablet';

  return projectName || 'Unknown';
}

export function buildBrowserStatistics(
  tests: DashboardTestResult[]
): Record<string, BrowserStats> {
  const output: Record<string, BrowserStats> = {};

  for (const test of tests) {
    const browser =
      test.browserFamily || 'Unknown';

    output[browser] ??= {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      averageDuration: 0,
      health: 0,
    };

    const stats = output[browser];

    stats.total += 1;

    if (test.status === 'passed') {
      stats.passed += 1;
    }

    if (test.status === 'failed') {
      stats.failed += 1;
    }

    if (test.status === 'skipped') {
      stats.skipped += 1;
    }

    if (test.status === 'timedOut') {
      stats.timedOut += 1;
    }

    if (test.status === 'interrupted') {
      stats.interrupted += 1;
    }
  }

  for (
    const [browser, stats]
    of Object.entries(output)
  ) {
    const browserTests =
      tests.filter(
        test =>
          test.browserFamily === browser
      );

    const duration =
      browserTests.reduce(
        (sum, test) =>
          sum + test.duration,
        0
      );

    stats.averageDuration =
      stats.total > 0
        ? Math.round(
            duration / stats.total
          )
        : 0;

    stats.health =
      stats.total > 0
        ? Math.round(
            (stats.passed / stats.total) *
              100
          )
        : 0;
  }

  return output;
}

export function buildProfileStatistics(
  tests: DashboardTestResult[]
): Record<string, BrowserStats> {
  const output: Record<string, BrowserStats> = {};

  for (const test of tests) {
    const profile =
      test.profile || 'Unknown';

    output[profile] ??= {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      averageDuration: 0,
      health: 0,
    };

    const stats = output[profile];

    stats.total += 1;

    if (test.status === 'passed') {
      stats.passed += 1;
    }

    if (test.status === 'failed') {
      stats.failed += 1;
    }

    if (test.status === 'skipped') {
      stats.skipped += 1;
    }

    if (test.status === 'timedOut') {
      stats.timedOut += 1;
    }

    if (test.status === 'interrupted') {
      stats.interrupted += 1;
    }
  }

  for (
    const [profile, stats]
    of Object.entries(output)
  ) {
    const profileTests =
      tests.filter(
        test =>
          test.profile === profile
      );

    const duration =
      profileTests.reduce(
        (sum, test) =>
          sum + test.duration,
        0
      );

    stats.averageDuration =
      stats.total > 0
        ? Math.round(
            duration / stats.total
          )
        : 0;

    stats.health =
      stats.total > 0
        ? Math.round(
            (stats.passed / stats.total) *
              100
          )
        : 0;
  }

  return output;
}

export function buildCategoryStatistics(
  tests: DashboardTestResult[]
): Record<string, CategoryStats> {
  const output: Record<string, CategoryStats> = {};

  for (const test of tests) {
    output[test.category] ??= {
      total: 0,
      passed: 0,
      failed: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      health: 0,
    };

    const stats = output[test.category];
    stats.total += 1;

    if (test.status === 'passed') {
      stats.passed += 1;
    }

    if (['failed', 'timedOut', 'interrupted'].includes(test.status)) {
      stats.failed += 1;
    }

    stats[test.severity] += 1;
  }

  for (const stats of Object.values(output)) {
    stats.health =
      stats.total > 0
        ? Math.round((stats.passed / stats.total) * 100)
        : 0;
  }

  return output;
}
