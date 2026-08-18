import { expect, test } from '@playwright/test';

import { analyzeCompatibility } from '../../reporters/analyzers/sentinel-compatibility';
import { analyzeSecurityPerformance } from '../../reporters/analyzers/sentinel-security-performance';
import type { DashboardTestResult } from '../../reporters/models/types';
import { expectedCompatibilityCoverage } from '../../reporters/utils/compatibility-config';
import {
  classifyAgainstThreshold,
  classifyLatencySamples,
  classifyTimeoutResilience,
  parsePerformanceObservation,
  PERFORMANCE_OBSERVATION_TYPE,
} from '../../reporters/utils/performance-metrics';
import { loadSecurityPerformanceConfig } from '../../reporters/utils/security-performance-config';

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 'perf-1',
    title: 'sample',
    fullTitle: 'sample',
    status: 'passed',
    duration: 400,
    retries: 0,
    project: 'nation-chromium',
    browserFamily: 'Chromium',
    profile: 'Desktop',
    file: 'tests/nation/performance.spec.ts',
    line: 1,
    tags: [],
    annotations: [],
    errors: [],
    attachments: [],
    qualityDimensions: ['security-performance'],
    ...overrides,
  } as DashboardTestResult;
}

test.describe('performance threshold classification', () => {
  test('loads pageLoad, api, backend and timeout thresholds', () => {
    const config = loadSecurityPerformanceConfig();

    expect(config.performance.thresholds.pageLoadMs).toBe(8_000);
    expect(config.performance.thresholds.apiLatencyMs).toBe(3_000);
    expect(config.performance.thresholds.backendLatencyMs).toBe(3_000);
    expect(config.performance.thresholds.timeoutMs).toBe(30_000);
  });

  test('classifies observed duration against a positive threshold', () => {
    expect(classifyAgainstThreshold(1_200, 8_000)).toBe('healthy');
    expect(classifyAgainstThreshold(8_000, 8_000)).toBe('healthy');
    expect(classifyAgainstThreshold(8_001, 8_000)).toBe('poor');
  });

  test('empty API samples are not-observed, not poor', () => {
    const classified = classifyLatencySamples([], 3_000);

    expect(classified.status).toBe('not-observed');
    expect(classified.sampleCount).toBe(0);
    expect(classified.p95).toBeUndefined();
  });

  test('API and page-load samples use p50/p95 against the catalog threshold', () => {
    const classified = classifyLatencySamples(
      [800, 1_200, 9_000],
      8_000
    );

    expect(classified.sampleCount).toBe(3);
    expect(classified.p50).toBe(1_200);
    expect(classified.p95).toBe(9_000);
    expect(classified.status).toBe('poor');
  });

  test('page-load observations fill the page-load area from measured durations', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'home-perf',
          category: 'performance',
          annotations: [
            { type: 'performance-area', description: 'page-load' },
            {
              type: PERFORMANCE_OBSERVATION_TYPE,
              description: JSON.stringify({
                area: 'page-load',
                page: 'homepage',
                durationMs: 1_400,
                source: 'navigation-timing',
                sampleCount: 1,
              }),
            },
            {
              type: PERFORMANCE_OBSERVATION_TYPE,
              description: JSON.stringify({
                area: 'api-latency',
                page: 'homepage',
                observation: 'not-observed',
                sampleCount: 0,
              }),
            },
          ],
        }),
      ],
      [],
      {
        p95Duration: 1_400,
        averageDuration: 400,
        medianDuration: 400,
      },
      loadSecurityPerformanceConfig()
    );

    const pageLoad = assessment.performance.areas.find(
      area => area.area === 'page-load'
    );
    const api = assessment.performance.areas.find(
      area => area.area === 'api-latency'
    );
    const duration = assessment.performance.areas.find(
      area => area.area === 'test-duration'
    );
    const timeout = assessment.performance.areas.find(
      area => area.area === 'timeout-resilience'
    );
    const backend = assessment.performance.areas.find(
      area => area.area === 'backend-latency'
    );

    expect(pageLoad?.status).toBe('healthy');
    expect(pageLoad?.observedValueMs).toBe(1_400);
    expect(api?.status).toBe('not-observed');
    expect(assessment.performance.status).not.toBe('poor');
    expect(duration?.status).toBe('healthy');
    expect(timeout?.status).toBe('healthy');
    expect(backend?.status).toBe('not-observed');
    expect(assessment.performance.status).toBe('healthy');
  });

  test('page-load over threshold is poor', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'slow-home',
          category: 'performance',
          annotations: [
            { type: 'performance-area', description: 'page-load' },
            {
              type: PERFORMANCE_OBSERVATION_TYPE,
              description: JSON.stringify({
                area: 'page-load',
                page: 'homepage',
                durationMs: 12_000,
                source: 'playwright-load',
                sampleCount: 1,
              }),
            },
          ],
        }),
      ],
      [],
      { p95Duration: 12_000 },
      loadSecurityPerformanceConfig()
    );
    const pageLoad = assessment.performance.areas.find(
      area => area.area === 'page-load'
    );

    expect(pageLoad?.status).toBe('poor');
    expect(assessment.performance.status).toBe('poor');
  });

  test('Playwright expect Timeout text is not timeout-resilience evidence', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'copy-bug',
          title: 'homepage has no duplicated skills wording',
          status: 'failed',
          duration: 5_200,
        }),
      ],
      [
        {
          source: 'test',
          category: 'content',
          severity: 'medium',
          classification: 'content-bug',
          title: 'homepage has no duplicated skills wording',
          errorMessage:
            'expect(locator).not.toContainText(expected) failed\nTimeout: 5000ms',
        },
      ],
      { p95Duration: 5_200 },
      loadSecurityPerformanceConfig()
    );
    const timeout = assessment.performance.areas.find(
      area => area.area === 'timeout-resilience'
    );

    expect(timeout?.status).toBe('healthy');
    expect(timeout?.issueCount).toBe(0);
    expect(timeout?.status).not.toBe('degraded');
    expect(timeout?.status).not.toBe('poor');
  });

  test('timed-out tests make timeout-resilience poor', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'hung',
          status: 'timedOut',
          duration: 30_000,
        }),
      ],
      [],
      { p95Duration: 30_000 },
      loadSecurityPerformanceConfig()
    );
    const timeout = assessment.performance.areas.find(
      area => area.area === 'timeout-resilience'
    );

    expect(timeout?.status).toBe('poor');
    expect(timeout?.thresholdConfigured).toBe(true);
  });

  test('parses not-observed performance annotations', () => {
    expect(
      parsePerformanceObservation('not-observed')?.observation
    ).toBe('not-observed');
    expect(
      parsePerformanceObservation(
        JSON.stringify({
          area: 'page-load',
          page: 'sign-in',
          durationMs: 900,
        })
      )?.durationMs
    ).toBe(900);
  });

  test('timeout resilience maps slow tests against the configured threshold', () => {
    const classified = classifyTimeoutResilience(
      [
        sampleTest({ id: 'fast', duration: 200 }),
        sampleTest({ id: 'slow', duration: 31_000 }),
      ],
      30_000
    );

    expect(classified.slowCount).toBe(1);
    expect(classified.timedOutCount).toBe(0);
    expect(classified.status).toBe('poor');
  });
});

test.describe('compatibility not-in-this-run', () => {
  test('catalog includes Chromium, Firefox, WebKit and mobile chrome', () => {
    const expected = expectedCompatibilityCoverage();

    expect(expected.browsers).toEqual(['Chromium', 'Firefox', 'WebKit']);
    expect(expected.profiles).toEqual(['Desktop', 'Mobile Chrome']);
  });

  test('chromium-only runs measure Chromium and mark others not-in-this-run, not poor', () => {
    const assessment = analyzeCompatibility(
      [
        sampleTest({
          id: 'home',
          title: 'homepage loads successfully',
          browserFamily: 'Chromium',
          profile: 'Desktop',
          project: 'nation-chromium',
        }),
      ],
      [],
      expectedCompatibilityCoverage()
    );

    const chromium = assessment.browserAssessments.find(
      item => item.environment === 'Chromium'
    );
    const firefox = assessment.browserAssessments.find(
      item => item.environment === 'Firefox'
    );
    const webkit = assessment.browserAssessments.find(
      item => item.environment === 'WebKit'
    );
    const mobile = assessment.profileAssessments.find(
      item => item.environment === 'Mobile Chrome'
    );
    const desktop = assessment.profileAssessments.find(
      item => item.environment === 'Desktop'
    );

    expect(chromium?.status).toBe('healthy');
    expect(firefox?.status).toBe('not-in-this-run');
    expect(webkit?.status).toBe('not-in-this-run');
    expect(mobile?.status).toBe('not-in-this-run');
    expect(desktop?.status).toBe('healthy');
    expect(assessment.status).toBe('healthy');
    expect(assessment.status).not.toBe('poor');
    expect(firefox?.notes?.join(' ')).toMatch(/not in this run/i);
  });

  test('firefox failure in a multi-browser run is poor, not hidden', () => {
    const assessment = analyzeCompatibility(
      [
        sampleTest({
          id: 'chrome',
          title: 'homepage loads successfully',
          browserFamily: 'Chromium',
          profile: 'Desktop',
          project: 'nation-chromium',
        }),
        sampleTest({
          id: 'firefox',
          title: 'homepage loads successfully',
          browserFamily: 'Firefox',
          profile: 'Desktop',
          project: 'nation-firefox',
          status: 'failed',
          classification: 'product-bug',
        }),
      ],
      [],
      expectedCompatibilityCoverage()
    );

    const firefox = assessment.browserAssessments.find(
      item => item.environment === 'Firefox'
    );

    expect(firefox?.status).toBe('poor');
    expect(assessment.status).toBe('poor');
  });
});
