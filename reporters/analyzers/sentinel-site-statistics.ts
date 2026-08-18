import type {
  DashboardTestResult,
} from '../models/types';

export interface SiteStatistics {
  site: string;

  total: number;

  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  flaky: number;

  warnings: number;

  averageDuration: number;
  health: number;
  passRate: number;
}

export type SiteStatisticsMap =
  Record<string, SiteStatistics>;

function calculateHealth(
  tests: DashboardTestResult[]
): number {
  if (tests.length === 0) {
    return 100;
  }

  const passed =
    tests.filter(
      test =>
        test.status === 'passed'
    ).length;

  const failed =
    tests.filter(
      test =>
        test.status === 'failed'
    ).length;

  const timedOut =
    tests.filter(
      test =>
        test.status === 'timedOut'
    ).length;

  const interrupted =
    tests.filter(
      test =>
        test.status === 'interrupted'
    ).length;

  const executed =
    passed +
    failed +
    timedOut +
    interrupted;

  if (executed === 0) {
    return 0;
  }

  return Math.round(
    (passed / executed) * 100
  );
}

function averageDuration(
  tests: DashboardTestResult[]
): number {
  if (tests.length === 0) {
    return 0;
  }

  const totalDuration =
    tests.reduce(
      (sum, test) =>
        sum + test.duration,
      0
    );

  return Math.round(
    totalDuration /
    tests.length
  );
}

export function buildSiteStatistics(
  tests: DashboardTestResult[]
): SiteStatisticsMap {
  const grouped =
    new Map<
      string,
      DashboardTestResult[]
    >();

  for (const test of tests) {
    const site =
      test.site || 'unknown';

    const existing =
      grouped.get(site) ?? [];

    existing.push(test);

    grouped.set(
      site,
      existing
    );
  }

  const result:
    SiteStatisticsMap = {};

  for (
    const [site, siteTests]
    of grouped.entries()
  ) {
    result[site] = {
      site,

      total:
        siteTests.length,

      passed:
        siteTests.filter(
          test =>
            test.status ===
            'passed'
        ).length,

      failed:
        siteTests.filter(
          test =>
            test.status ===
            'failed'
        ).length,

      skipped:
        siteTests.filter(
          test =>
            test.status ===
            'skipped'
        ).length,

      timedOut:
        siteTests.filter(
          test =>
            test.status ===
            'timedOut'
        ).length,

      interrupted:
        siteTests.filter(
          test =>
            test.status ===
            'interrupted'
        ).length,

      flaky:
        siteTests.filter(
          test =>
            test.retry > 0 &&
            test.status ===
            'passed'
        ).length,

      warnings:
        siteTests.filter(
          test =>
            test.classification ===
            'warning'
        ).length,

      averageDuration:
        averageDuration(
          siteTests
        ),

      health:
        calculateHealth(
          siteTests
        ),

      passRate:
        calculateHealth(
          siteTests
        ),
    };
  }

  return result;
}