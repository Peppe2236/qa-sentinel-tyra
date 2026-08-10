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
  detectCategory,
  VITAL_RANK,
} from './analyzers/sentinel-category';

import {
  detectSeverity,
} from './analyzers/sentinel-severity';

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
} from './models/types';


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
  tests: DashboardTestResult[]
): RiskLevel {
  const criticalProductBugs = tests.filter(
    test =>
      test.classification === 'product-bug' &&
      test.severity === 'critical'
  ).length;

  if (
    summary.securityIssues > 0 ||
    criticalProductBugs > 0
  ) {
    return 'critical';
  }

  if (
    summary.productBugs > 1 ||
    summary.accessibilityIssues > 2
  ) {
    return 'high';
  }

  if (
    summary.productBugs > 0 ||
    summary.performanceIssues > 0 ||
    summary.needsInvestigation > 0
  ) {
    return 'medium';
  }

  return 'low';
}

function buildReleaseAssessment(
  health: number,
  summary: ClassificationSummary,
  tests: DashboardTestResult[]
): ReleaseAssessment {
  const risk =
    releaseRisk(summary, tests);

  const blockingIssues =
    summary.securityIssues +
    tests.filter(
      test =>
        test.classification === 'product-bug' &&
        ['critical', 'high'].includes(test.severity)
    ).length;

  const totalIssues =
    summary.productBugs +
    summary.contentBugs +
    summary.automationIssues +
    summary.accessibilityIssues +
    summary.performanceIssues +
    summary.securityIssues +
    summary.needsInvestigation +
    summary.warnings;

  const nonBlockingIssues =
    Math.max(0, totalIssues - blockingIssues);

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
        'Fix critical product or security issues, rerun the affected tests and review the release assessment again.',
    };
  }

  if (
    summary.productBugs > 0 ||
    summary.needsInvestigation > 0 ||
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
        'Review confirmed product issues first, then correct content and automation findings.',
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
  browserFamily(project),
      status: result.status,
      expectedStatus:
        test.expectedStatus,

      duration: result.duration,
      retry: result.retry,

      severity,
      category,

      vitalRank:
        VITAL_RANK[category],

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

    const categoryStatistics =
      buildCategoryStatistics(
        this.results
      );

      const siteStatistics =
  buildSiteStatistics(
    this.results
  );

    const prioritizedIssues =
      sortIssues(this.results);

    const classificationSummary =
      buildClassificationSummary(
        this.results
      );

    const releaseAssessment =
      buildReleaseAssessment(
        health.health,
        classificationSummary,
        this.results
      );

    const metadata =
      buildMetadata();

    const run: DashboardRun = {
      schemaVersion: 4,
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

      classificationSummary,
      releaseAssessment,
      metadata,

      prioritizedIssues,
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

    writeJson(
      latestRunFile,
      outputRun
    );

    writeJson(
      issuesFile,
      prioritizedIssues
    );

    const history =
      readJson<SentinelOutput[]>(
        historyFile,
        []
      );

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