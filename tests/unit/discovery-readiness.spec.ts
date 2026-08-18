import { expect, test } from '@playwright/test';

import { buildDiscoveryReadiness } from '../../reporters/analyzers/sentinel-discovery-readiness';

test.describe('discovery-aware release readiness', () => {
  test('populates route counters from discovery JSON even with zero Playwright route tests', () => {
    const readiness = buildDiscoveryReadiness({
      tests: [],
      discoveryIssues: [
        {
          source: 'discovery',
          site: 'nation',
          route: '/',
          category: 'analytics',
          severity: 'low',
          title: 'Analytics request blocked by Content Security Policy',
          description: 'CSP telemetry mismatch',
          userImpact: 'No product-flow impact',
          recommendation: 'Align CSP',
          classification: 'warning',
          priorityScore: 40,
          priority: 'P3',
          occurrences: 2,
          affectedRoutes: ['/'],
          fingerprint: 'csp-ga',
        },
      ],
      apiEvidence: [
        {
          kind: 'api-endpoint',
          site: 'nation',
          method: 'GET',
          url: 'https://nation.dev/',
          statusCode: 200,
          resourceType: 'document',
          originSource: 'discovery',
          observedAt: '2026-08-18T12:00:00.000Z',
        },
      ],
      inventory: {
        sites: ['nation', 'ai-skills'],
        routes: [
          { site: 'nation', pathname: '/' },
          { site: 'nation', pathname: '/signin' },
          { site: 'ai-skills', pathname: '/skills' },
        ],
        scanPassed: 12,
        scanObserved: 13,
        apiPositive: 4,
        sourceArtifacts: [
          'reports/discovery/nation.json',
          'reports/discovery/ai-skills.json',
        ],
        generatedAt: '2026-08-18T12:00:00.000Z',
      },
    });

    expect(readiness.routePositive).toBeGreaterThan(0);
    expect(readiness.routeObserved).toBeGreaterThan(0);
    expect(readiness.apiPositive).toBeGreaterThan(0);
    expect(readiness.sites).toEqual(['ai-skills', 'nation']);
    expect(readiness.warningCount).toBe(1);
    expect(readiness.status).not.toBe('not-verified');
  });
});
