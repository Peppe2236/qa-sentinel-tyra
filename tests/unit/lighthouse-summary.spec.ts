import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { analyzeSecurityPerformance } from '../../reporters/analyzers/sentinel-security-performance';
import type { DashboardTestResult } from '../../reporters/models/types';
import {
  applyLighthouseSummaries,
  loadLighthouseSummaries,
  parseLighthouseJson,
} from '../../reporters/utils/lighthouse-summary';
import { loadSecurityPerformanceConfig } from '../../reporters/utils/security-performance-config';

const lighthouseFixture = {
  requestedUrl: 'https://nation.dev/',
  finalUrl: 'https://nation.dev/',
  fetchTime: '2026-08-18T00:00:00.000Z',
  categories: {
    performance: { score: 0.72 },
    accessibility: { score: 0.91 },
    'best-practices': { score: 0.88 },
    seo: { score: 0.8 },
  },
  audits: {
    'largest-contentful-paint': { numericValue: 2400 },
    'first-contentful-paint': { numericValue: 1100 },
    'cumulative-layout-shift': { numericValue: 0.04 },
  },
};

function sampleTest(
  overrides: Partial<DashboardTestResult> = {}
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

test.describe('lighthouse summary', () => {
  test('parses category scores and LCP from CLI JSON', () => {
    const summary = parseLighthouseJson(
      lighthouseFixture,
      'lighthouse-nation.json'
    );

    expect(summary?.page).toBe('nation-home');
    expect(summary?.performanceScore).toBe(72);
    expect(summary?.accessibilityScore).toBe(91);
    expect(summary?.lcpMs).toBe(2400);
    expect(summary?.fcpMs).toBe(1100);
  });

  test('loads lighthouse-*.json from a reports directory', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lighthouse-'));

    fs.writeFileSync(
      path.join(directory, 'lighthouse-nation.json'),
      JSON.stringify(lighthouseFixture),
      'utf8'
    );
    fs.writeFileSync(
      path.join(directory, 'ignore-me.json'),
      JSON.stringify({ nope: true }),
      'utf8'
    );

    const summaries = loadLighthouseSummaries(directory);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].performanceScore).toBe(72);
  });

  test('attaches lighthouse notes without changing performance status', () => {
    const assessment = analyzeSecurityPerformance(
      [sampleTest()],
      [],
      { p95Duration: 400, averageDuration: 400, medianDuration: 400 },
      loadSecurityPerformanceConfig()
    );
    const before = assessment.performance.status;
    const updated = applyLighthouseSummaries(assessment, [
      parseLighthouseJson(lighthouseFixture, 'lighthouse-nation.json')!,
    ]);

    expect(updated.performance.status).toBe(before);

    const pageLoad = updated.performance.areas.find(
      area => area.area === 'page-load'
    );
    const lcp = updated.performance.areas.find(
      area => area.area === 'largest-contentful-paint'
    );

    expect(pageLoad?.notes?.join(' ')).toMatch(/Lighthouse nation-home/);
    expect(pageLoad?.notes?.join(' ')).toMatch(/performance 72/);
    expect(lcp?.notes?.join(' ')).toMatch(/LCP 2400ms/);
  });
});
