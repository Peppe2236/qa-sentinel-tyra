import { expect, test } from '@playwright/test';

import { analyzeUxUi } from '../../reporters/analyzers/sentinel-ux-ui';
import { analyzeSecurityPerformance } from '../../reporters/analyzers/sentinel-security-performance';
import type { DashboardTestResult } from '../../reporters/models/types';
import {
  PERFORMANCE_OBSERVATION_TYPE,
  parsePerformanceObservation,
} from '../../reporters/utils/performance-metrics';
import { loadSecurityPerformanceConfig } from '../../reporters/utils/security-performance-config';
import {
  httpsLinkFinding,
  isAllowedHomepageHref,
  isInsecureHttpUrl,
  mixedContentFinding,
} from '../../reporters/utils/transport-security';

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 'm7-1',
    title: 'sample',
    fullTitle: 'sample',
    status: 'passed',
    duration: 200,
    retries: 0,
    project: 'nation-chromium',
    file: 'tests/nation/ux-intelligence.spec.ts',
    line: 1,
    tags: [],
    annotations: [],
    errors: [],
    attachments: [],
    qualityDimensions: ['ux-ui'],
    ...overrides,
  } as DashboardTestResult;
}

test.describe('M7.4 UX/UI measured signals', () => {
  test('nav, forms, visual, responsive and a11y passing tests fill those UX areas', () => {
    const assessment = analyzeUxUi(
      [
        sampleTest({
          id: 'nav',
          category: 'navigation',
        }),
        sampleTest({
          id: 'forms',
          category: 'authentication',
        }),
        sampleTest({
          id: 'visual',
          category: 'visual',
        }),
        sampleTest({
          id: 'responsive',
          category: 'responsive',
        }),
        sampleTest({
          id: 'a11y',
          category: 'accessibility',
        }),
      ],
      []
    );

    const byArea = Object.fromEntries(
      assessment.areas.map(area => [area.area, area.status])
    );

    expect(byArea.navigation).toBe('healthy');
    expect(byArea['forms-validation']).toBe('healthy');
    expect(byArea['visual-stability']).toBe('healthy');
    expect(byArea['responsive-usability']).toBe('healthy');
    expect(byArea.accessibility).toBe('healthy');
    expect(assessment.unverifiedAreas).not.toContain('navigation');
    expect(assessment.unverifiedAreas).not.toContain('forms-validation');
    expect(assessment.status).not.toBe('not-verified');
  });

  test('unverified UX areas stay not-verified rather than poor', () => {
    const assessment = analyzeUxUi(
      [
        sampleTest({
          id: 'nav-only',
          category: 'navigation',
        }),
      ],
      []
    );
    const visual = assessment.areas.find(
      area => area.area === 'visual-stability'
    );

    expect(visual?.status).toBe('not-verified');
    expect(assessment.status).not.toBe('poor');
  });
});

test.describe('M7.5 transport security beyond headers', () => {
  test('mixed content fails only when http: requests are observed', () => {
    const clean = mixedContentFinding('homepage', [
      'https://nation.dev/logo.svg',
      'https://aiskills.nation.dev/skills',
    ]);
    const mixed = mixedContentFinding('homepage', [
      'https://nation.dev/',
      'http://cdn.example.com/legacy.js',
    ]);

    expect(isInsecureHttpUrl('https://nation.dev/')).toBe(false);
    expect(isInsecureHttpUrl('http://insecure.example/x')).toBe(true);
    expect(clean.passed).toBe(true);
    expect(mixed.passed).toBe(false);
    expect(mixed.message).toMatch(/mixed content/i);
    expect(mixed.securityAreas).toEqual(['transport']);
  });

  test('homepage http: hrefs fail; relative, https, mailto and tel pass', () => {
    expect(isAllowedHomepageHref('/signin')).toBe(true);
    expect(isAllowedHomepageHref('#join')).toBe(true);
    expect(isAllowedHomepageHref('https://nation.dev/privacy')).toBe(true);
    expect(isAllowedHomepageHref('mailto:hello@nation.dev')).toBe(true);
    expect(isAllowedHomepageHref('http://insecure.example/join')).toBe(false);

    const clean = httpsLinkFinding('homepage', [
      '/signin',
      'https://nation.dev/privacy',
      'mailto:hello@nation.dev',
    ]);
    const insecure = httpsLinkFinding('homepage', [
      '/signin',
      'http://nation.dev/old',
    ]);

    expect(clean.passed).toBe(true);
    expect(insecure.passed).toBe(false);
    expect(insecure.message).toMatch(/http:/i);
  });
});

test.describe('M7.6 LCP observation', () => {
  test('parses LCP observations including not-observed', () => {
    expect(
      parsePerformanceObservation(
        JSON.stringify({
          area: 'largest-contentful-paint',
          page: 'homepage',
          durationMs: 1_200,
          fcpMs: 400,
          source: 'performance-observer',
        })
      )?.durationMs
    ).toBe(1_200);

    expect(
      parsePerformanceObservation(
        JSON.stringify({
          area: 'largest-contentful-paint',
          page: 'catalog',
          observation: 'not-observed',
          sampleCount: 0,
        })
      )?.observation
    ).toBe('not-observed');
  });

  test('not-observed LCP is not poor', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'home-perf',
          category: 'performance',
          file: 'tests/nation/performance.spec.ts',
          qualityDimensions: ['security-performance'],
          annotations: [
            { type: 'performance-area', description: 'largest-contentful-paint' },
            {
              type: PERFORMANCE_OBSERVATION_TYPE,
              description: JSON.stringify({
                area: 'largest-contentful-paint',
                page: 'homepage',
                observation: 'not-observed',
                sampleCount: 0,
                source: 'performance-observer',
              }),
            },
          ],
        }),
      ],
      [],
      { p95Duration: 400 },
      loadSecurityPerformanceConfig()
    );
    const lcp = assessment.performance.areas.find(
      area => area.area === 'largest-contentful-paint'
    );

    expect(lcp?.status).toBe('not-observed');
    expect(lcp?.status).not.toBe('poor');
    expect(assessment.performance.status).not.toBe('poor');
  });

  test('measured LCP under pageLoadMs is healthy', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'home-lcp',
          category: 'performance',
          file: 'tests/nation/performance.spec.ts',
          qualityDimensions: ['security-performance'],
          annotations: [
            {
              type: 'performance-area',
              description: 'largest-contentful-paint',
            },
            {
              type: PERFORMANCE_OBSERVATION_TYPE,
              description: JSON.stringify({
                area: 'largest-contentful-paint',
                page: 'homepage',
                durationMs: 1_100,
                fcpMs: 350,
                sampleCount: 1,
                source: 'performance-observer',
              }),
            },
          ],
        }),
      ],
      [],
      { p95Duration: 400 },
      loadSecurityPerformanceConfig()
    );
    const lcp = assessment.performance.areas.find(
      area => area.area === 'largest-contentful-paint'
    );

    expect(lcp?.status).toBe('healthy');
    expect(lcp?.observedValueMs).toBe(1_100);
    expect(assessment.performance.observed.lcpP95).toBe(1_100);
  });
});
