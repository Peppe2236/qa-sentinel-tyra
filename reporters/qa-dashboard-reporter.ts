import {
  analyzeAutonomousQaInvestigationPlanning,
} from './analyzers/sentinel-autonomous-qa';

import {
  analyzeUnifiedDecisioning,
} from './analyzers/sentinel-unified-scoring';

import {
  analyzeCrossLayerCorrelation,
} from './analyzers/sentinel-cross-layer';

import {
  applyApiBackendReleaseGate,
  promoteApiBackendIntelligence,
} from './analyzers/sentinel-api-backend';

import {
  analyzeCompatibility,
  applyCompatibilityReleaseGate,
} from './analyzers/sentinel-compatibility';

import {
  analyzeSecurityPerformance,
  applySecurityPerformanceReleaseGate,
} from './analyzers/sentinel-security-performance';

import {
  loadSecurityPerformanceConfig,
} from './utils/security-performance-config';

import {
  analyzeUxUi,
  applyUxUiReleaseGate,
} from './analyzers/sentinel-ux-ui';

import {
  loadCriticalFlows,
} from './utils/critical-flows';

import {
  analyzeCriticalFlowCoverage,
  applyCriticalFlowReleaseGate,
  buildCriticalFlowEvidenceFromTests,
} from './analyzers/sentinel-critical-flows';

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import crypto from 'node:crypto';
import path from 'node:path';

import {
  loadApiBackendEvidence,
  loadDiscoveryIssues,
} from './utils/discovery-issues';

import type {
  DashboardDiscoveryIssue,
} from './utils/discovery-issues';

import {
  detectCategory,
  VITAL_RANK,
} from './analyzers/sentinel-category';

import {
  detectSeverity,
} from './analyzers/sentinel-severity';

import {
  analyzeTestQualityContext,
  buildQualityDimensionStatistics,
} from './analyzers/sentinel-quality-intelligence';


import {
  analyzeAttachments,
} from './analyzers/sentinel-attachments';

import {
  analyzePerformance,
} from './analyzers/sentinel-performance';

import {
  buildSiteStatistics,
} from './analyzers/sentinel-site-statistics';

import {
  browserFamily,
  buildBrowserStatistics,
  buildCategoryStatistics,
  buildProfileStatistics,
} from './analyzers/sentinel-statistics';


import {
  analyzeHealth,
} from './analyzers/sentinel-health';

import {
  classifyIssue,
} from './analyzers/sentinel-classifier';

import {
  analyzeSentinelAi,
} from './analyzers/sentinel-ai';

import type {
  SentinelOutput,
} from './models/sentinel-output';

import {
  sortIssues,
} from './utils/issue-sorter';

import {
  readJson,
  writeJson,
} from './utils/json-store';

import {
  consolidateTestIssues,
} from './utils/test-issue-dedup';

import {
  loadRequirements,
} from './utils/requirements';

import {
  analyzeRequirementCoverage,
  applyRequirementReleaseGate,
  buildRequirementEvidenceFromTests,
} from './analyzers/sentinel-requirements';


import type {
  ActionableTestIssue,
} from './utils/test-issue-dedup';

type UnifiedReleaseIssue =
  | ActionableTestIssue
  | DashboardDiscoveryIssue
  | ApiIntelligenceIssue
  | BackendIntelligenceIssue;

import {
  writeMarkdownReport,
} from './utils/markdown-report';
import {
  writeHtmlReport,
} from './utils/html-report';

import type {
  ClassificationSummary,
  DashboardRun,
  DashboardTestResult,
  IssueClassification,
  ReleaseAssessment,
  RiskLevel,
  RunMetadata,
  ApiIntelligenceIssue,
  BackendIntelligenceIssue,
} from './models/types';

function resolveBrowserFamily(
  projectName: string,
  configuredBrowserName?: string
): string {
  const browser =
    configuredBrowserName?.toLowerCase();

  if (browser === 'chromium') {
    return 'Chromium';
  }

  if (browser === 'firefox') {
    return 'Firefox';
  }

  if (browser === 'webkit') {
    return 'WebKit';
  }

  const normalized =
    projectName.toLowerCase();

  if (normalized.includes('firefox')) {
    return 'Firefox';
  }

  if (
    normalized.includes('webkit') ||
    normalized.includes('safari')
  ) {
    return 'WebKit';
  }

  if (
    normalized.includes('chromium') ||
    normalized.includes('chrome')
  ) {
    return 'Chromium';
  }

  if (normalized.includes('tablet')) {
    return 'Chromium';
  }

  return 'Unknown';
}

function resolveProfile(
  projectName: string
): string {
  const normalized =
    projectName.toLowerCase();

  if (
    normalized.includes('mobile-chrome')
  ) {
    return 'Mobile Chrome';
  }

  if (
    normalized.includes('mobile-safari')
  ) {
    return 'Mobile Safari';
  }

  if (
    normalized.includes('tablet')
  ) {
    return 'Tablet';
  }

  return 'Desktop';
}


function countClassification(
  tests: DashboardTestResult[],
  classification: IssueClassification
): number {
  return tests.filter(
    test => test.classification === classification
  ).length;
}

function buildClassificationSummary(
  tests: DashboardTestResult[]
): ClassificationSummary {
  return {
    productBugs:
      countClassification(tests, 'product-bug'),

    contentBugs:
      countClassification(tests, 'content-bug'),

    automationIssues:
      countClassification(tests, 'automation-issue'),

    accessibilityIssues:
      countClassification(tests, 'accessibility-issue'),

    performanceIssues:
      countClassification(tests, 'performance-issue'),

    securityIssues:
      countClassification(tests, 'security-issue'),

    needsInvestigation:
      countClassification(tests, 'needs-investigation'),

    warnings:
      countClassification(tests, 'warning'),
  };
}

function buildActionableClassificationSummary(
  issues: ActionableTestIssue[]
): ClassificationSummary {
  const count = (
    classification: IssueClassification
  ): number =>
    issues.filter(
      issue =>
        issue.classification === classification
    ).length;

  return {
    productBugs:
      count('product-bug'),

    contentBugs:
      count('content-bug'),

    automationIssues:
      count('automation-issue'),

    accessibilityIssues:
      count('accessibility-issue'),

    performanceIssues:
      count('performance-issue'),

    securityIssues:
      count('security-issue'),

    needsInvestigation:
      count('needs-investigation'),

    warnings:
      count('warning'),
  };
}


function uniqueStrings(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}


function enrichActionableIssueQualityContext(
  issue: ActionableTestIssue,
  tests: DashboardTestResult[]
): ActionableTestIssue {
  const relatedTests =
    tests.filter(
      test =>
        issue.sourceTestIds.includes(
          test.id
        )
    );

  return {
    ...issue,

    qualityDimensions:
      [
        ...new Set(
          relatedTests.flatMap(
            test =>
              test.qualityDimensions ??
              []
          )
        ),
      ],

    requirementIds:
      uniqueStrings(
        relatedTests.flatMap(
          test =>
            test.requirementIds ??
            []
        )
      ),

    acceptanceCriteriaIds:
      uniqueStrings(
        relatedTests.flatMap(
          test =>
            test.acceptanceCriteriaIds ??
            []
        )
      ),

    criticalFlows:
      uniqueStrings(
        relatedTests.flatMap(
          test =>
            test.criticalFlowIds?.length
              ? test.criticalFlowIds
              : test.criticalFlow
                ? [test.criticalFlow]
                : []
        )
      ),

    flowScenarioIds:
      uniqueStrings(
        relatedTests.flatMap(
          test =>
            test.flowScenarioIds ??
            []
        )
      ),
  };
}


function issueConfidence(
  classification: IssueClassification
): number {
  switch (classification) {
    case 'product-bug':
      return 95;

    case 'content-bug':
      return 99;

    case 'automation-issue':
      return 92;

    case 'accessibility-issue':
      return 90;

    case 'performance-issue':
      return 88;

    case 'security-issue':
      return 92;

    case 'warning':
      return 80;

    case 'needs-investigation':
      return 65;

    case 'none':
    default:
      return 100;
  }
}

function estimatedFixMinutes(
  classification: IssueClassification
): number | undefined {
  switch (classification) {
    case 'content-bug':
      return 10;

    case 'automation-issue':
      return 15;

    case 'warning':
      return 20;

    case 'needs-investigation':
      return 30;

    case 'performance-issue':
      return 60;

    case 'accessibility-issue':
      return 45;

    case 'product-bug':
      return 60;

    case 'security-issue':
      return 120;

    case 'none':
    default:
      return undefined;
  }
}

function rootCauseFor(
  result: DashboardTestResult
): string | undefined {
  switch (result.classification) {
    case 'product-bug':
      return (
        'The application accepted the user interaction, but the expected ' +
        'functional state or visible result was not produced.'
      );

    case 'content-bug':
      return (
        'Visible website copy contains malformed, duplicated or incorrect text.'
      );

    case 'automation-issue':
      return (
        'The Playwright expectation or locator no longer matches the current page.'
      );

    case 'accessibility-issue':
      return (
        'The page does not meet the expected accessibility requirement.'
      );

    case 'performance-issue':
      return (
        'The measured duration exceeded the configured performance expectation.'
      );

    case 'security-issue':
      return (
        'A security-related response, configuration or browser event was detected.'
      );

    case 'needs-investigation':
      return (
        'The automated evidence is not sufficient to confirm whether the cause ' +
        'is in the product, test automation or environment.'
      );

    case 'warning':
      return (
        'A non-blocking condition was detected without confirmed user impact.'
      );

    case 'none':
    default:
      return undefined;
  }
}

function userImpactFor(
  classification: IssueClassification
): string | undefined {
  switch (classification) {
    case 'product-bug':
      return 'A user-facing function may not work as intended.';

    case 'content-bug':
      return 'Users may see confusing or unprofessional website text.';

    case 'automation-issue':
      return 'No confirmed production impact; test reliability is affected.';

    case 'accessibility-issue':
      return 'Some users may have difficulty accessing or operating the interface.';

    case 'performance-issue':
      return 'Users may experience slower loading or interaction.';

    case 'security-issue':
      return 'Security or privacy may be affected and requires review.';

    case 'needs-investigation':
      return 'User impact has not yet been confirmed.';

    case 'warning':
      return 'No confirmed user impact.';

    case 'none':
    default:
      return undefined;
  }
}

function enrichResult(
  result: DashboardTestResult
): DashboardTestResult {
  const classification =
    result.classification ?? 'needs-investigation';

  return {
    ...result,

    confidence:
      issueConfidence(classification),

    estimatedFixMinutes:
      estimatedFixMinutes(classification),

    rootCause:
      rootCauseFor(result),

    userImpact:
      userImpactFor(classification),
  };
}

function releaseRisk(
  summary: ClassificationSummary,
  issues: UnifiedReleaseIssue[]
): RiskLevel {
  const criticalProductBugs =
    issues.filter(
      issue =>
        issue.source === 'test' &&
        issue.classification === 'product-bug' &&
        issue.severity === 'critical'
    ).length;

  const hasP0DiscoveryIssue =
    issues.some(
      issue =>
        issue.source === 'discovery' &&
        issue.priority === 'P0'
    );

  const hasHighPriorityDiscoveryIssue =
    issues.some(
      issue =>
        issue.source === 'discovery' &&
        (
          issue.priority === 'P1' ||
          issue.priority === 'P2'
        )
    );

  const hasMediumPriorityDiscoveryIssue =
    issues.some(
      issue =>
        issue.source === 'discovery' &&
        issue.priority === 'P3'
    );

  if (
    summary.securityIssues > 0 ||
    criticalProductBugs > 0 ||
    hasP0DiscoveryIssue
  ) {
    return 'critical';
  }

  if (
    summary.productBugs > 1 ||
    summary.accessibilityIssues > 2 ||
    hasHighPriorityDiscoveryIssue
  ) {
    return 'high';
  }

  if (
    summary.productBugs > 0 ||
    summary.performanceIssues > 0 ||
    summary.needsInvestigation > 0 ||
    hasMediumPriorityDiscoveryIssue
  ) {
    return 'medium';
  }

  return 'low';
}

function buildReleaseAssessment(
  health: number,
  summary: ClassificationSummary,
  issues: UnifiedReleaseIssue[]
): ReleaseAssessment {
  const risk =
    releaseRisk(
      summary,
      issues
    );

  const blockingIssues =
    issues.filter(
      issue => {
        if (
          issue.source === 'discovery'
        ) {
          return issue.priority === 'P0';
        }

        return (
          (
            issue.classification === 'product-bug' &&
            ['critical', 'high'].includes(
              issue.severity
            )
          ) ||
          issue.classification === 'security-issue'
        );
      }
    ).length;

  const totalIssues =
    issues.length;

  const nonBlockingIssues =
    Math.max(
      0,
      totalIssues - blockingIssues
    );

  if (
    blockingIssues > 0 ||
    risk === 'critical'
  ) {
    return {
      status: 'not-ready',
      risk,
      confidence: 95,
      blockingIssues,
      nonBlockingIssues,
      verdict:
        'The current build should not be released until blocking issues are resolved.',
      recommendedAction:
        'Fix critical product, security or P0 discovery issues, rerun the affected tests and review the release assessment again.',
    };
  }

  if (
    summary.productBugs > 0 ||
    summary.needsInvestigation > 0 ||
    risk === 'high' ||
    risk === 'medium' ||
    health < 90
  ) {
    return {
      status: 'ready-with-warnings',
      risk,
      confidence: 90,
      blockingIssues,
      nonBlockingIssues,
      verdict:
        'The build is generally stable, but unresolved issues should be reviewed before release.',
      recommendedAction:
        'Review confirmed product and high-priority discovery issues first, then correct content and automation findings.',
    };
  }

  return {
    status: 'ready',
    risk,
    confidence: 96,
    blockingIssues,
    nonBlockingIssues,
    verdict:
      'The build is stable and no confirmed release-blocking issue was detected.',
    recommendedAction:
      'Continue monitoring and expand coverage for important user flows.',
  };
}


/*
 * Milestone 5 - Canonical Unified Release Authority
 *
 * RiskLevel is deliberately derived from semantic state,
 * priority and severity.
 *
 * riskScore is NOT converted using arbitrary numeric
 * thresholds.
 */
function canonicalRiskFromUnifiedDecision(
  decision:
    ReturnType<
      typeof analyzeUnifiedDecisioning
    >
): RiskLevel {

  const priority =
    decision.highestPriority;

  const severity =
    decision.highestSeverity;


  if (
    priority === 'P0' ||
    severity === 'critical'
  ) {
    return 'critical';
  }


  if (
    priority === 'P1' ||
    severity === 'high' ||
    decision.state === 'not-ready'
  ) {
    return 'high';
  }


  if (
    priority === 'P2' ||
    priority === 'P3' ||
    severity === 'medium' ||
    decision.state ===
      'ready-with-warnings' ||
    decision.state ===
      'not-verified'
  ) {
    return 'medium';
  }


  return 'low';
}


function buildCanonicalReleaseAssessment(
  legacy:
    ReleaseAssessment,

  decision:
    ReturnType<
      typeof analyzeUnifiedDecisioning
    >
): ReleaseAssessment {

  const gates =
    decision.gateSummary;


  const risk =
    canonicalRiskFromUnifiedDecision(
      decision
    );


  /*
   * Unified confidence is canonical whenever available.
   *
   * A clean/no-decision-unit run may legitimately have
   * null Unified evidence confidence. ReleaseAssessment
   * historically requires a number, so the already
   * established release confidence is retained only as
   * a compatibility fallback in that case.
   */
  const confidence =
    decision.confidence ??
    legacy.confidence;


  const blockers =
    decision.blockingGateDimensions;

  const gaps =
    decision.verificationGapDimensions;


  let verdict:
    string;

  let recommendedAction:
    string;


  if (
    decision.state ===
      'not-ready'
  ) {

    verdict =
      blockers.length > 0
        ? (
            'The build is not ready for release. ' +
            'Unified Decisioning detected blocking ' +
            'quality gates: ' +
            blockers.join(', ') +
            '.'
          )
        : (
            'The build is not ready for release. ' +
            'Unified Decisioning detected confirmed ' +
            'release-blocking evidence.'
          );


    recommendedAction =
      'Resolve the blocking decision units or quality gates, ' +
      'rerun the affected verification and review the ' +
      'Unified release assessment again.';

  } else if (
    decision.state ===
      'not-verified'
  ) {

    verdict =
      'Release readiness cannot currently be verified because ' +
      'required quality intelligence is incomplete.';


    recommendedAction =
      'Complete the missing quality verification before making ' +
      'a release decision.';

  } else if (
    decision.state ===
      'ready-with-warnings'
  ) {

    verdict =
      gaps.length > 0
        ? (
            'No confirmed release blocker was detected, but ' +
            'Unified Decisioning found warnings or verification ' +
            'gaps in: ' +
            gaps.join(', ') +
            '.'
          )
        : (
            'No confirmed release blocker was detected, but ' +
            'Unified Decisioning found non-blocking issues that ' +
            'should be reviewed before release.'
          );


    recommendedAction =
      'Review the Unified warning decision units and complete ' +
      'remaining verification gaps before release where practical.';

  } else {

    verdict =
      'Unified Decisioning found no confirmed release blocker, ' +
      'warning decision unit or unresolved quality gate.';


    recommendedAction =
      'The build is ready according to the current Unified ' +
      'Quality Intelligence evidence. Continue monitoring ' +
      'quality trends.';
  }


  return {
    status:
      decision.state,

    risk,

    confidence,

    /*
     * Schema v5 compatibility fields.
     *
     * These now represent deduplicated decision units,
     * not duplicated raw evidence records.
     */
    blockingIssues:
      decision.blockingUnits,

    nonBlockingIssues:
      decision.warningUnits,

    verdict,

    recommendedAction,

    blockingRequirements:
      gates.blockingRequirements,

    requirementGaps:
      gates.requirementGaps,

    blockingFlows:
      gates.blockingFlows,

    flowGaps:
      gates.flowGaps,

    blockingUxAreas:
      gates.blockingUxAreas,

    uxUiGaps:
      gates.uxUiGaps,

    blockingSecurityAreas:
      gates.blockingSecurityAreas,

    blockingPerformanceAreas:
      gates.blockingPerformanceAreas,

    securityGaps:
      gates.securityGaps,

    performanceGaps:
      gates.performanceGaps,

    blockingCompatibilityRegressions:
      gates.blockingCompatibilityRegressions,

    compatibilityGaps:
      gates.compatibilityGaps,

    blockingApiIssues:
      gates.blockingApiIssues,

    blockingBackendIssues:
      gates.blockingBackendIssues,

    apiIntelligenceGaps:
      gates.apiIntelligenceGaps,

    backendIntelligenceGaps:
      gates.backendIntelligenceGaps,
  };
}


function buildMetadata(): RunMetadata {
  return {
    build:
      process.env.BUILD_NUMBER ??
      process.env.GITHUB_RUN_NUMBER,

    branch:
      process.env.GITHUB_REF_NAME ??
      process.env.BRANCH_NAME ??
      'local',

    commit:
      process.env.GITHUB_SHA?.slice(0, 8),

    runNumber:
      process.env.GITHUB_RUN_NUMBER,
  };
}

function printReleaseStatus(
  assessment: ReleaseAssessment
): void {
  const statusLabel = {
    ready: 'READY FOR RELEASE',
    'ready-with-warnings': 'READY WITH WARNINGS',
    'not-ready': 'DO NOT RELEASE',
    'not-verified': 'RELEASE NOT VERIFIED',
  }[assessment.status];

  console.log('');
  console.log('RELEASE READINESS');
  console.log('--------------------------------------------------');
  console.log(`Status: ${statusLabel}`);
  console.log(`Risk: ${assessment.risk.toUpperCase()}`);
  console.log(`Confidence: ${assessment.confidence}%`);
  console.log(
    `Blocking issues: ${assessment.blockingIssues}`
  );
  console.log(
    `Non-blocking issues: ${assessment.nonBlockingIssues}`
  );
  console.log(`Verdict: ${assessment.verdict}`);
  console.log(
    `Recommended action: ${assessment.recommendedAction}`
  );
}

class QaDashboardReporter implements Reporter {
  private startedAt = new Date();
  private results: DashboardTestResult[] = [];
  private config?: FullConfig;
  private discoveredTests = 0;

  onBegin(
    config: FullConfig,
    suite: Suite
  ): void {
    this.config = config;
    this.startedAt = new Date();
    this.results = [];
    this.discoveredTests =
      suite.allTests().length;

    console.log('');
    console.log(
      '=================================================='
    );
    console.log(
      '           QA SENTINEL TYRA TEST RUN'
    );
    console.log(
      '=================================================='
    );
    console.log(
      `Discovered tests: ${this.discoveredTests}`
    );
    console.log(
      'Priority: user-impacting flows first'
    );
    console.log(
      '=================================================='
    );
  }

  onTestEnd(
    test: TestCase,
    result: TestResult
  ): void {
    const project =
      test.parent.project()?.name ??
      'unknown';

    const category =
      detectCategory(test, result);

    const severity =
      detectSeverity(
        test,
        result,
        category
      );

    const qualityContext =
      analyzeTestQualityContext(
        test,
        result,
        category
      );

    const fullTitle =
      test.titlePath().join(' > ');

    const id = crypto
      .createHash('sha1')
      .update(
        `${project}|${test.location.file}|${fullTitle}`
      )
      .digest('hex')
      .slice(0, 12);

    const dashboardResult: DashboardTestResult = {
      id,
      title: test.title,
      fullTitle,

      file: path
        .relative(
          process.cwd(),
          test.location.file
        )
        .replaceAll('\\', '/'),

      line: test.location.line,
      column: test.location.column,

      project,

site:
  project.startsWith('ai-skills-')
    ? 'ai-skills'
    : 'nation',

browserFamily:
  resolveBrowserFamily(
    project,
    this.config?.projects.find(
      configuredProject =>
        configuredProject.name === project
    )?.use?.browserName
  ),

profile:
  resolveProfile(project),

      status: result.status,
      expectedStatus:
        test.expectedStatus,

      duration: result.duration,
      retry: result.retry,

      severity,
      category,

      vitalRank:
        VITAL_RANK[category],

      qualityDimensions:
        qualityContext.qualityDimensions,

      requirementIds:
        qualityContext.requirementIds,

      acceptanceCriteriaIds:
        qualityContext.acceptanceCriteriaIds,

      criticalFlow:
        qualityContext.criticalFlow,

      criticalFlowIds:
        qualityContext.criticalFlowIds,

      flowScenarioIds:
        qualityContext.flowScenarioIds,

      tags: [...test.tags],

      annotations: [
        ...test.annotations,
        ...result.annotations,
      ].map(annotation => ({
        type: annotation.type,
        description:
          annotation.description,
      })),

      error: result.error
        ? {
            message:
              result.error.message,

            stack:
              result.error.stack,

            snippet:
              result.error.snippet,
          }
        : undefined,

      attachments:
        analyzeAttachments(result),

      startedAt:
        result.startTime?.toISOString(),
    };

    const classification =
      classifyIssue(dashboardResult);

    dashboardResult.classification =
      classification.classification;

    dashboardResult.classificationReason =
      classification.reason;

    dashboardResult.recommendation =
      classification.recommendation;

    this.results.push(
      enrichResult(dashboardResult)
    );
  }

  async onEnd(
    fullResult: FullResult
  ): Promise<void> {
    if (this.results.length === 0) {
      console.log('');
      console.log(
        'QA Sentinel Tyra: no tests were executed.'
      );
      console.log(
        'Existing dashboard data was preserved.'
      );

      if (this.discoveredTests > 0) {
        console.log(
          `${this.discoveredTests} tests were discovered but not run.`
        );
      }

      return;
    }

    const finishedAt = new Date();

    const wallClockDuration =
      finishedAt.getTime() -
      this.startedAt.getTime();

    const health =
      analyzeHealth(this.results);

    const performance =
      analyzePerformance(
        this.results,
        wallClockDuration
      );

    const browserStatistics =
      buildBrowserStatistics(
        this.results
      );

      const profileStatistics =
  buildProfileStatistics(
    this.results
  );

    const categoryStatistics =
      buildCategoryStatistics(
        this.results
      );

      const siteStatistics =
  buildSiteStatistics(
    this.results
  );

const discoveryDirectory =
  path.resolve(
    process.cwd(),
    'reports',
    'discovery'
  );

const nationDiscoveryFile =
  path.join(
    discoveryDirectory,
    'nation.json'
  );

const aiSkillsDiscoveryFile =
  path.join(
    discoveryDirectory,
    'ai-skills.json'
  );

     const hasDiscoveryRun =
  this.results.some(
    test =>
      test.file.includes(
        'discovery'
      ) ||
      test.title
        .toLowerCase()
        .includes(
          'discover configured site'
        )
  );

const discoveryIssues =
  hasDiscoveryRun
    ? loadDiscoveryIssues()
    : [];

const apiBackendEvidence =
  hasDiscoveryRun
    ? loadApiBackendEvidence()
    : [];

const prioritizedIssues =
  sortIssues(this.results);
const actionableTestIssues =
  consolidateTestIssues(
    this.results
  ).map(
    issue =>
      enrichActionableIssueQualityContext(
        issue,
        this.results
      )
  );

const baseUnifiedIssues:
  UnifiedReleaseIssue[] = [
    ...actionableTestIssues,
    ...discoveryIssues,
  ];


const apiBackendPromotion =
  promoteApiBackendIntelligence(
    [
      ...actionableTestIssues,
      ...discoveryIssues,
    ],
    apiBackendEvidence
  );


const {
  apiIssues,
  backendIssues,
  assessment:
    apiBackendAssessment,
} = apiBackendPromotion;


const unifiedIssues:
  UnifiedReleaseIssue[] = [
    ...baseUnifiedIssues,
    ...apiIssues,
    ...backendIssues,
  ];

const crossLayerAssessment =
  analyzeCrossLayerCorrelation(
    unifiedIssues
  );


const qualityDimensionStatistics =
  buildQualityDimensionStatistics(
    unifiedIssues
  );

const uxUiAssessment =
  analyzeUxUi(
    this.results,
    unifiedIssues
  );

const securityPerformanceConfig =
  loadSecurityPerformanceConfig();

const securityPerformanceAssessment =
  analyzeSecurityPerformance(
    this.results,
    unifiedIssues,
    performance,
    securityPerformanceConfig
  );

const configuredCompatibilityProjects =
  this.config?.projects ??
  [];


const expectedCompatibilityProjects =
  Array.from(
    new Set(
      configuredCompatibilityProjects
        .map(
          project =>
            project.name
        )
        .filter(Boolean)
    )
  );


const expectedCompatibilityBrowsers =
  Array.from(
    new Set(
      configuredCompatibilityProjects
        .map(
          project =>
            resolveBrowserFamily(
              project.name,
              project.use?.browserName
            )
        )
        .filter(
          browser =>
            browser !== 'Unknown'
        )
    )
  );


const expectedCompatibilityProfiles =
  Array.from(
    new Set(
      configuredCompatibilityProjects
        .map(
          project =>
            resolveProfile(
              project.name
            )
        )
        .filter(Boolean)
    )
  );


const compatibilityAssessment =
  analyzeCompatibility(
    this.results,
    unifiedIssues,
    {
      browsers:
        expectedCompatibilityBrowsers,

      profiles:
        expectedCompatibilityProfiles,

      projects:
        expectedCompatibilityProjects,
    }
  );

const requirements =
  loadRequirements();

const requirementEvidence =
  buildRequirementEvidenceFromTests(
    this.results,
    actionableTestIssues
  );

const requirementCoverage =
  analyzeRequirementCoverage(
    requirements,
    requirementEvidence
  );

const criticalFlows =
  loadCriticalFlows();

const criticalFlowEvidence =
  buildCriticalFlowEvidenceFromTests(
    this.results,
    actionableTestIssues
  );

const criticalFlowCoverage =
  analyzeCriticalFlowCoverage(
    criticalFlows,
    criticalFlowEvidence
  );

    const classificationSummary =
      buildClassificationSummary(
        this.results
      );

    const releaseClassificationSummary =
      buildActionableClassificationSummary(
        actionableTestIssues
      );

    const baseReleaseAssessment =
      buildReleaseAssessment(
        health.health,
        releaseClassificationSummary,
        baseUnifiedIssues
      );

    const requirementReleaseAssessment =
      applyRequirementReleaseGate(
        baseReleaseAssessment,
        requirementCoverage
      );

    const flowReleaseAssessment =
      applyCriticalFlowReleaseGate(
        requirementReleaseAssessment,
        criticalFlowCoverage
      );

    const uxUiReleaseAssessment =
      applyUxUiReleaseGate(
        flowReleaseAssessment,
        uxUiAssessment
      );

    const securityPerformanceReleaseAssessment =
      applySecurityPerformanceReleaseGate(
        uxUiReleaseAssessment,
        securityPerformanceAssessment
      );

    const compatibilityReleaseAssessment =
      applyCompatibilityReleaseGate(
        securityPerformanceReleaseAssessment,
        compatibilityAssessment
      );

    const legacyReleaseAssessment =
      applyApiBackendReleaseGate(
        compatibilityReleaseAssessment,
        apiBackendAssessment,
        apiIssues,
        backendIssues
      );

    const metadata =
      buildMetadata();

        /*
     * Milestone 5.9 shadow decision.
     *
     * IMPORTANT:
     * legacyReleaseAssessment above remains the official
     * release decision until shadow comparison is
     * explicitly approved.
     */
    const unifiedDecisionAssessment =
      analyzeUnifiedDecisioning(
        unifiedIssues,
        crossLayerAssessment,
        {
          complete:
            Boolean(
              requirementCoverage &&
              criticalFlowCoverage &&
              uxUiAssessment &&
              securityPerformanceAssessment &&
              compatibilityAssessment &&
              apiBackendAssessment &&
              crossLayerAssessment
            ),

          blockingRequirements:
            legacyReleaseAssessment.blockingRequirements,

          requirementGaps:
            legacyReleaseAssessment.requirementGaps,

          blockingFlows:
            legacyReleaseAssessment.blockingFlows,

          flowGaps:
            legacyReleaseAssessment.flowGaps,

          blockingUxAreas:
            legacyReleaseAssessment.blockingUxAreas,

          uxUiGaps:
            legacyReleaseAssessment.uxUiGaps,

          blockingSecurityAreas:
            legacyReleaseAssessment.blockingSecurityAreas,

          blockingPerformanceAreas:
            legacyReleaseAssessment.blockingPerformanceAreas,

          securityGaps:
            legacyReleaseAssessment.securityGaps,

          performanceGaps:
            legacyReleaseAssessment.performanceGaps,

          blockingCompatibilityRegressions:
            legacyReleaseAssessment.blockingCompatibilityRegressions,

          compatibilityGaps:
            legacyReleaseAssessment.compatibilityGaps,

          blockingApiIssues:
            legacyReleaseAssessment.blockingApiIssues,

          blockingBackendIssues:
            legacyReleaseAssessment.blockingBackendIssues,

          apiIntelligenceGaps:
            legacyReleaseAssessment.apiIntelligenceGaps,

          backendIntelligenceGaps:
            legacyReleaseAssessment.backendIntelligenceGaps,
        }
      );




const releaseAssessment =
  buildCanonicalReleaseAssessment(
    legacyReleaseAssessment,
    unifiedDecisionAssessment
  );


const autonomousQaHistoryFile =
  path.resolve(
    process.cwd(),
    'dashboard',
    'data',
    'history.json'
  );

const autonomousQaHistory =
  readJson<SentinelOutput[]>(
    autonomousQaHistoryFile,
    []
  );


const autonomousQaAssessment =
  analyzeAutonomousQaInvestigationPlanning(
    unifiedDecisionAssessment,
    'unified-v5',
    this.results,
    unifiedIssues,
    autonomousQaHistory
  );


const run: DashboardRun = {
      schemaVersion: 5,
      runId: crypto.randomUUID(),

      environment:
        process.env.CI
          ? 'CI'
          : 'local',

      baseURL:
        this.config?.projects[0]?.use
          ?.baseURL as
          | string
          | undefined,

      startedAt:
        this.startedAt.toISOString(),

      finishedAt:
        finishedAt.toISOString(),

      status:
        fullResult.status,

      totalTests:
        this.results.length,

      ...health,

      performance,
      browserStatistics,
      categoryStatistics,
      siteStatistics,
      profileStatistics,

      qualityDimensionStatistics,

      uxUiAssessment,

      securityPerformanceAssessment,

      compatibilityAssessment,

      apiBackendAssessment,

      crossLayerAssessment,

      unifiedDecisionAssessment,
      autonomousQaAssessment,
      apiIssues,
      backendIssues,

      requirements,
      requirementCoverage,

      criticalFlows,
      criticalFlowCoverage,
      classificationSummary,
      releaseAssessment,

  legacyReleaseAssessment,

  releaseDecisionSource:
    'unified-v5',
      metadata,

      prioritizedIssues,
      discoveryIssues,
      
      tests:
        this.results,
    };
const sentinelAi =
  analyzeSentinelAi(run);

const outputRun: SentinelOutput = {
  ...run,
  sentinelAi,
};
    const dataDirectory =
      path.resolve(
        process.cwd(),
        'dashboard',
        'data'
      );

    const latestRunFile =
      path.join(
        dataDirectory,
        'latest-run.json'
      );

    const historyFile =
      path.join(
        dataDirectory,
        'history.json'
      );

    const issuesFile =
      path.join(
        dataDirectory,
        'issues.json'
      );

      const unifiedIssuesFile =
  path.join(
    dataDirectory,
    'unified-issues.json'
  );

    writeJson(
      latestRunFile,
      outputRun
    );

    writeJson(
      issuesFile,
      prioritizedIssues
    );

    writeJson(
  unifiedIssuesFile,
  unifiedIssues
);

    writeJson(
  unifiedIssuesFile,
  unifiedIssues
);

    const history =
      [...autonomousQaHistory];

    history.push(outputRun);

    writeJson(
      historyFile,
      history.slice(-100)
    );


    const reportsDirectory =
      path.resolve(
        process.cwd(),
        'reports'
      );

    const markdownReportFile =
      writeMarkdownReport(
        run,
        reportsDirectory
      );

const htmlReportFile =
  writeHtmlReport(
    run,
    reportsDirectory
  );

    console.log('');
    console.log(
      '=================================================='
    );
    console.log(
      '          QA SENTINEL TYRA SUMMARY'
    );
    console.log(
      '=================================================='
    );

    console.log(
      `Overall health: ${run.health}%`
    );
    console.log(
      `Total tests: ${run.totalTests}`
    );
    console.log(
      `Passed: ${run.passed}`
    );
    console.log(
      `Failed: ${run.failed}`
    );
    console.log(
      `Skipped: ${run.skipped}`
    );
    console.log(
      `Timed out: ${run.timedOut}`
    );
    console.log(
      `Interrupted: ${run.interrupted}`
    );
    console.log(
      `Flaky: ${run.flaky}`
    );

    console.log('');
    console.log(
      'ISSUE CLASSIFICATION'
    );
    console.log(
      '--------------------------------------------------'
    );

    console.log(
      `Product bugs: ${classificationSummary.productBugs}`
    );
    console.log(
      `Content bugs: ${classificationSummary.contentBugs}`
    );
    console.log(
      `Automation issues: ${classificationSummary.automationIssues}`
    );
    console.log(
      `Accessibility issues: ${classificationSummary.accessibilityIssues}`
    );
    console.log(
      `Performance issues: ${classificationSummary.performanceIssues}`
    );
    console.log(
      `Security issues: ${classificationSummary.securityIssues}`
    );
    console.log(
      `Needs investigation: ${classificationSummary.needsInvestigation}`
    );
    console.log(
      `Warnings: ${classificationSummary.warnings}`
    );

    console.log('');
    console.log('PERFORMANCE');
    console.log(
      '--------------------------------------------------'
    );

    console.log(
      `Average duration: ${performance.averageDuration} ms`
    );
    console.log(
      `Median duration: ${performance.medianDuration} ms`
    );
    console.log(
      `P95 duration: ${performance.p95Duration} ms`
    );
    console.log(
      `Wall-clock duration: ${performance.wallClockDuration} ms`
    );

    printReleaseStatus(
      releaseAssessment
    );

    console.log('');
    console.log(
      `Latest result: ${latestRunFile}`
    );
    console.log(
      `Issues file: ${issuesFile}`
    );
    console.log(
      `Unified issues file: ${unifiedIssuesFile}`
    );
    console.log(
      `History file: ${historyFile}`
    );

    console.log(
      `Markdown report: ${markdownReportFile}`
    );

    console.log(
  `HTML report: ${htmlReportFile}`
    );

    console.log(
      `Reports folder: ${reportsDirectory}`
    );
    console.log(
      '=================================================='
    );
  }

  printsToStdio(): boolean {
    return true;
  }
}

export default QaDashboardReporter;