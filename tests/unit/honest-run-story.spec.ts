import { expect, test } from '@playwright/test';

import {
  analyzeSecurityPerformance,
  securityAreasForIssue,
} from '../../reporters/analyzers/sentinel-security-performance';
import { analyzeUnifiedDecisioning } from '../../reporters/analyzers/sentinel-unified-scoring';
import { qualityDimensionsForCategory } from '../../reporters/analyzers/sentinel-quality-intelligence';
import type { CrossLayerAssessment } from '../../reporters/models/types';
import { refineDiscoveryIssues } from '../../reporters/utils/discovery-issues';
import { loadSecurityPerformanceConfig } from '../../reporters/utils/security-performance-config';
import {
  classifyFailedNetworkSignal,
} from '../../reporters/utils/signal-classification';

function emptyCrossLayer(
  fingerprints: string[]
): CrossLayerAssessment {
  return {
    state: fingerprints.length > 0 ? 'standalone-only' : 'no-evidence',
    issueCount: fingerprints.length,
    correlatedIssueCount: 0,
    standaloneIssueCount: fingerprints.length,
    incidentCount: 0,
    blockingIncidents: 0,
    sourceCoverage: fingerprints.length > 0 ? ['discovery'] : [],
    incidents: [],
    standaloneIssueFingerprints: fingerprints,
  };
}

test.describe('honest run scoring', () => {
  test('does not treat https URLs as transport security failures', () => {
    const areas = securityAreasForIssue({
      category: 'network',
      severity: 'high',
      title: 'Unexpected failed network request',
      evidence:
        'FAILED_REQUEST at https://aiskills.nation.dev/skills/notebooklm',
    });

    expect(areas).toEqual([]);
  });

  test('maps analytics CSP only to content-security-policy and not poor overall', () => {
    const assessment = analyzeSecurityPerformance(
      [],
      [
        {
          source: 'discovery',
          category: 'analytics',
          severity: 'medium',
          title: 'Google Analytics blocked by CSP',
          evidence:
            "Connecting to 'https://region1.google-analytics.com/g/collect' violates Content Security Policy",
        },
      ],
      {},
      loadSecurityPerformanceConfig()
    );

    const transport = assessment.security.areas.find(
      area => area.area === 'transport'
    );
    const csp = assessment.security.areas.find(
      area => area.area === 'content-security-policy'
    );

    expect(transport?.status).toBe('not-verified');
    expect(csp?.status).toBe('degraded');
    expect(assessment.security.status).toBe('degraded');
    expect(assessment.status).not.toBe('poor');
    expect(assessment.status).not.toBe('healthy');
  });

  test('unverified security areas are not-verified rather than poor', () => {
    const assessment = analyzeSecurityPerformance(
      [],
      [],
      {},
      loadSecurityPerformanceConfig()
    );

    expect(assessment.security.status).toBe('not-verified');
    expect(assessment.performance.status).toBe('not-verified');
    expect(assessment.status).toBe('not-verified');
  });

  test('aborted media is discovery noise, not a HIGH product failure', () => {
    const classified = classifyFailedNetworkSignal({
      method: 'GET',
      url: 'https://cdn.nation.dev/nation-ai-literacy/videos/claude.mp4',
      error: 'net::ERR_ABORTED',
      pageRoute: '/skills/notebooklm',
    });

    expect(classified.action).toBe('ignore');
    expect(classified.kind).toBe('aborted-media');
  });

  test('downgrades /checkout/confirm 404 or aborted discovery noise', () => {
    const aborted = classifyFailedNetworkSignal({
      method: 'GET',
      url: 'https://nation.dev/checkout/confirm',
      error: 'net::ERR_ABORTED',
      pageRoute: '/checkout/confirm',
    });
    const missing = classifyFailedNetworkSignal({
      method: 'GET',
      url: 'https://nation.dev/checkout/confirm',
      status: 404,
      pageStatus: 404,
      pageRoute: '/checkout/confirm',
    });

    expect(aborted.severity).toBe('low');
    expect(aborted.classification).toBe('warning');
    expect(aborted.userImpact).toBe(false);
    expect(missing.kind).toBe('missing-route');
    expect(missing.severity).toBe('low');
  });

  test('keeps a real /checkout/confirm 500 as HIGH with route evidence', () => {
    const classified = classifyFailedNetworkSignal({
      method: 'POST',
      url: 'https://nation.dev/checkout/confirm',
      status: 500,
      pageRoute: '/checkout/confirm',
    });

    expect(classified.action).toBe('keep');
    expect(classified.severity).toBe('high');
    expect(classified.userImpact).toBe(true);
    expect(classified.annotation).toContain('/checkout/confirm');
    expect(classified.annotation).toContain('500');
  });

  test('analytics category is security-performance, not requirements', () => {
    expect(qualityDimensionsForCategory('analytics')).toEqual([
      'security-performance',
    ]);
  });

  test('drops aborted media from dashboard discovery issues', () => {
    const refined = refineDiscoveryIssues([
      {
        source: 'discovery',
        site: 'ai-skills',
        route: '/skills/notebooklm',
        category: 'network',
        severity: 'high',
        title: 'Unexpected failed network request',
        description: 'Unexpected failed network request was recorded by Smart Scan.',
        evidence:
          'GET https://cdn.nation.dev/nation-ai-literacy/videos/claude.mp4 - net::ERR_ABORTED',
        userImpact: 'The finding may affect a user-visible route or interaction.',
        recommendation: 'Inspect and resolve the Smart Scan finding.',
        priorityScore: 85,
        priority: 'P1',
        occurrences: 2,
        affectedRoutes: ['/skills/notebooklm'],
        fingerprint: 'noise-1',
      },
    ]);

    expect(refined).toHaveLength(0);
  });

  test('unified decisioning warns on gaps instead of scoring a clean GO', () => {
    const fingerprints = ['csp-1'];
    const decision = analyzeUnifiedDecisioning(
      [
        {
          source: 'discovery',
          fingerprint: 'csp-1',
          title: 'Google Analytics blocked by CSP',
          severity: 'low',
          classification: 'warning',
          priority: 'P3',
          priorityScore: 45,
          qualityDimensions: ['security-performance'],
        },
      ],
      emptyCrossLayer(fingerprints),
      {
        complete: true,
        uxUiGaps: 8,
        securityGaps: 7,
        performanceGaps: 6,
        compatibilityGaps: 15,
      }
    );

    expect(decision.state).toBe('ready-with-warnings');
    expect(decision.scoreBasis).toBe('verification-gaps');
    expect(decision.qualityScore).toBeNull();
    expect(decision.blockingUnits).toBe(0);
    expect(decision.verificationGapDimensions).toEqual(
      expect.arrayContaining(['ux-ui', 'security', 'performance', 'compatibility'])
    );
  });

  test('a real HIGH checkout failure still drives decision-unit risk', () => {
    const fingerprints = ['checkout-1'];
    const decision = analyzeUnifiedDecisioning(
      [
        {
          source: 'discovery',
          fingerprint: 'checkout-1',
          title: 'Checkout confirm network request failed',
          severity: 'high',
          classification: 'product-bug',
          priority: 'P1',
          priorityScore: 85,
          qualityDimensions: ['api-backend'],
        },
      ],
      emptyCrossLayer(fingerprints),
      {
        complete: true,
        uxUiGaps: 8,
        securityGaps: 7,
      }
    );

    expect(decision.state).toBe('ready-with-warnings');
    expect(decision.scoreBasis).toBe('decision-units');
    expect(decision.riskScore).toBe(85);
    expect(decision.highestSeverity).toBe('high');
  });
});
