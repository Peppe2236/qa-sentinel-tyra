import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  analyzeRequirementCoverage,
  applyRequirementReleaseGate,
  buildRequirementEvidenceFromTests,
} from '../../reporters/analyzers/sentinel-requirements';
import {
  analyzeCriticalFlowCoverage,
  applyCriticalFlowReleaseGate,
  buildCriticalFlowEvidenceFromTests,
} from '../../reporters/analyzers/sentinel-critical-flows';
import { analyzeSecurityPerformance } from '../../reporters/analyzers/sentinel-security-performance';
import { qualityDimensionsForRequirements } from '../../reporters/analyzers/sentinel-quality-intelligence';
import type {
  DashboardTestResult,
  ReleaseAssessment,
} from '../../reporters/models/types';
import { loadCriticalFlows } from '../../reporters/utils/critical-flows';
import { loadRequirements } from '../../reporters/utils/requirements';
import {
  loadSecurityPerformanceConfig,
  SECURITY_AREAS,
  type SecurityPerformanceConfig,
} from '../../reporters/utils/security-performance-config';

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 'test-1',
    title: 'sample',
    fullTitle: 'sample',
    status: 'passed',
    duration: 100,
    retries: 0,
    project: 'nation-chromium',
    file: 'tests/nation/homepage.spec.ts',
    line: 1,
    tags: [],
    annotations: [],
    errors: [],
    attachments: [],
    ...overrides,
  } as DashboardTestResult;
}

function sampleRelease(): ReleaseAssessment {
  return {
    status: 'ready',
    risk: 'low',
    confidence: 90,
    verdict: 'Ready.',
    recommendedAction: 'Ship.',
    blockingIssues: 0,
    nonBlockingIssues: 0,
    warnings: 0,
  } as ReleaseAssessment;
}

function securityConfig(
  requiredChecks: SecurityPerformanceConfig['security']['requiredChecks']
): SecurityPerformanceConfig {
  return {
    schemaVersion: 1,
    security: {
      requiredChecks,
    },
    performance: {
      thresholds: {},
    },
  };
}

test.describe('requirements catalog', () => {
  test('loads structured Nation and AI Skills requirements', () => {
    const requirements = loadRequirements();
    const ids = requirements.map(requirement => requirement.id);

    expect(requirements.length).toBeGreaterThan(0);
    expect(ids).toContain('REQ-NATION-HOME-001');
    expect(ids).toContain('REQ-NATION-AUTH-001');
    expect(ids).toContain('REQ-SKILLS-HOME-001');
    expect(ids).toContain('REQ-NATION-AUTH-005');

    const auth = requirements.find(
      requirement => requirement.id === 'REQ-NATION-AUTH-001'
    );

    expect(auth?.acceptanceCriteria?.length).toBeGreaterThan(0);
  });

  test('marks requirements without evidence as not-tested', () => {
    const coverage = analyzeRequirementCoverage(loadRequirements(), []);
    const auth = coverage.find(item => item.requirementId === 'REQ-NATION-AUTH-005');

    expect(auth?.status).toBe('not-tested');
  });

  test('maps passing annotated tests onto acceptance criteria', () => {
    const requirements = loadRequirements().filter(
      requirement => requirement.id === 'REQ-NATION-AUTH-002'
    );
    const evidence = buildRequirementEvidenceFromTests([
      sampleTest({
        id: 'reset-form',
        requirementIds: ['REQ-NATION-AUTH-002'],
        acceptanceCriteriaIds: [
          'AC-NATION-AUTH-002-EMAIL',
          'AC-NATION-AUTH-002-SUBMIT',
        ],
        status: 'passed',
      }),
    ]);
    const coverage = analyzeRequirementCoverage(requirements, evidence);

    expect(coverage).toHaveLength(1);
    expect(coverage[0].status).toBe('pass');
    expect(coverage[0].criteria.every(criterion => criterion.status === 'pass')).toBe(
      true
    );
  });

  test('critical untested requirements make the release gate not-ready', () => {
    const coverage = analyzeRequirementCoverage(loadRequirements(), []);
    const gated = applyRequirementReleaseGate(sampleRelease(), coverage);
    const blockingCritical = coverage.filter(
      item => item.critical && item.status !== 'pass'
    );

    expect(blockingCritical.map(item => item.requirementId).sort()).toEqual(
      [
        'REQ-NATION-AUTH-001',
        'REQ-NATION-AUTH-002',
        'REQ-NATION-AUTH-003',
        'REQ-NATION-HOME-001',
        'REQ-SKILLS-HOME-001',
      ].sort()
    );
    expect(gated.status).toBe('not-ready');
    expect(gated.risk).toBe('critical');
  });
});

test.describe('critical flows catalog', () => {
  test('loads flows derived from Nation and AI Skills routes', () => {
    const flows = loadCriticalFlows();
    const ids = flows.map(flow => flow.id);

    expect(ids).toContain('FLOW-NATION-PUBLIC-HOME');
    expect(ids).toContain('FLOW-NATION-SIGNIN');
    expect(ids).toContain('FLOW-SKILLS-CATALOG');
    expect(ids).toContain('FLOW-NATION-AUTHENTICATED-SESSION');
  });

  test('maps passing tests onto a critical happy-path scenario', () => {
    const flows = loadCriticalFlows().filter(
      flow => flow.id === 'FLOW-NATION-RESET-PASSWORD'
    );
    const evidence = buildCriticalFlowEvidenceFromTests([
      sampleTest({
        id: 'reset',
        criticalFlowIds: ['FLOW-NATION-RESET-PASSWORD'],
        flowScenarioIds: ['SCN-NATION-RESET-FORM'],
        status: 'passed',
      }),
    ]);
    const coverage = analyzeCriticalFlowCoverage(flows, evidence);

    expect(coverage[0].status).toBe('pass');
  });

  test('critical untested flows make the release gate not-ready', () => {
    const coverage = analyzeCriticalFlowCoverage(loadCriticalFlows(), []);
    const gated = applyCriticalFlowReleaseGate(sampleRelease(), coverage);
    const blocking = coverage.filter(
      flow =>
        flow.critical && flow.status !== 'pass'
    );

    expect(blocking.map(flow => flow.flowId).sort()).toEqual(
      [
        'FLOW-NATION-PUBLIC-HOME',
        'FLOW-NATION-RESET-PASSWORD',
        'FLOW-NATION-SIGNIN',
        'FLOW-NATION-SIGNUP',
        'FLOW-SKILLS-CATALOG',
      ].sort()
    );
    expect(gated.status).toBe('not-ready');
  });
});

test.describe('security and performance config', () => {
  test('loads required checks and duration thresholds', () => {
    const config = loadSecurityPerformanceConfig();

    expect(config.schemaVersion).toBe(1);
    expect(config.security.requiredChecks).toContain('authentication');
    expect(config.security.requiredChecks).toContain('content-security-policy');
    expect(config.performance.thresholds.p95DurationMs).toBe(25_000);
    expect(config.performance.thresholds.pageLoadMs).toBe(8_000);
  });

  test('uses p95 threshold as test-duration evidence', () => {
    const assessment = analyzeSecurityPerformance(
      [],
      [],
      {
        p95Duration: 4_000,
        averageDuration: 1_000,
        medianDuration: 800,
      },
      loadSecurityPerformanceConfig()
    );
    const testDuration = assessment.performance.areas.find(
      area => area.area === 'test-duration'
    );

    expect(assessment.performance.thresholdsConfigured).toBe(true);
    expect(testDuration?.thresholdConfigured).toBe(true);
    expect(testDuration?.status).toBe('healthy');
    expect(testDuration?.observedValueMs).toBe(4_000);
  });

  test('requiredChecks are known security areas and drive unverified scope', () => {
    const config = loadSecurityPerformanceConfig();
    const assessment = analyzeSecurityPerformance([], [], {}, config);
    const areaIds = assessment.security.areas.map(area => area.area);

    expect(config.security.requiredChecks.length).toBeGreaterThan(0);
    expect(
      config.security.requiredChecks.every(check => SECURITY_AREAS.includes(check))
    ).toBe(true);
    expect(assessment.security.requiredChecks).toEqual(config.security.requiredChecks);
    expect(areaIds).toEqual(config.security.requiredChecks);
    expect(assessment.security.unverifiedAreas).toEqual(config.security.requiredChecks);
    expect(areaIds).not.toContain('authorization');
    expect(areaIds).not.toContain('dependency-security');
    expect(assessment.security.areas.every(area => area.required)).toBe(true);
    expect(assessment.security.status).toBe('not-verified');
  });

  test('a custom requiredChecks list does not invent unlisted areas', () => {
    const assessment = analyzeSecurityPerformance(
      [],
      [],
      {},
      securityConfig(['authentication'])
    );

    expect(assessment.security.areas.map(area => area.area)).toEqual(['authentication']);
    expect(assessment.security.unverifiedAreas).toEqual(['authentication']);
    expect(assessment.security.requiredChecks).toEqual(['authentication']);
  });

  test('passing authentication tests verify the catalog authentication check', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'signin-form',
          category: 'authentication',
          qualityDimensions: ['security-performance'],
          status: 'passed',
        }),
      ],
      [],
      {},
      loadSecurityPerformanceConfig()
    );
    const auth = assessment.security.areas.find(area => area.area === 'authentication');

    expect(auth?.status).toBe('healthy');
    expect(auth?.required).toBe(true);
    expect(auth?.evidenceSources).toContain('test');
    expect(assessment.security.verifiedAreas).toEqual(['authentication']);
    expect(assessment.security.unverifiedAreas).not.toContain('authentication');
    expect(assessment.security.unverifiedAreas).toContain('transport');
    expect(assessment.security.status).toBe('not-verified');
  });

  test('security-area annotations map tests onto a required check', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'https-home',
          category: 'availability',
          qualityDimensions: ['security-performance'],
          annotations: [{ type: 'security-area', description: 'transport' }],
          status: 'passed',
        }),
      ],
      [],
      {},
      securityConfig(['transport', 'authentication'])
    );
    const transport = assessment.security.areas.find(area => area.area === 'transport');

    expect(transport?.status).toBe('healthy');
    expect(assessment.security.verifiedAreas).toEqual(['transport']);
    expect(assessment.security.unverifiedAreas).toEqual(['authentication']);
  });

  test('findings outside requiredChecks still surface without becoming catalog gaps', () => {
    const assessment = analyzeSecurityPerformance(
      [],
      [
        {
          source: 'discovery',
          category: 'security',
          severity: 'high',
          classification: 'security-issue',
          title: 'Unexpected authorization failure',
          evidence: 'HTTP 403 forbidden on /jobs',
        },
      ],
      {},
      securityConfig(['authentication'])
    );
    const authorization = assessment.security.areas.find(
      area => area.area === 'authorization'
    );

    expect(authorization?.required).toBe(false);
    expect(authorization?.status).toBe('poor');
    expect(assessment.security.unverifiedAreas).toEqual(['authentication']);
    expect(assessment.security.status).toBe('poor');
  });

  test('rejects unknown requiredChecks values', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-sec-'));
    const file = path.join(dir, 'security-performance.json');

    fs.writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: 1,
        security: {
          requiredChecks: ['authentication', 'not-a-real-check'],
        },
        performance: {
          thresholds: {},
        },
      })
    );

    expect(() => loadSecurityPerformanceConfig(file)).toThrow(/not-a-real-check/);
  });

  test('requirement catalog qualityDimensions feed dashboard dimensions', () => {
    const dimensions = qualityDimensionsForRequirements(
      ['REQ-NATION-HOME-001'],
      loadRequirements()
    );

    expect(dimensions).toEqual(
      expect.arrayContaining([
        'requirements-functionality',
        'ux-ui',
        'api-backend',
      ])
    );
    expect(
      qualityDimensionsForRequirements(['REQ-DOES-NOT-EXIST'], loadRequirements())
    ).toEqual([]);
  });
});
