import type {
  DashboardTestResult,
  Severity,
} from '../models/types';

import {
  consolidateTestIssues,
} from '../utils/test-issue-dedup';

export interface HealthSummary {
  health: number;

  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  flaky: number;

   criticalBugs: number;
  highBugs: number;
  mediumBugs: number;
  lowBugs: number;

  warnings: number;

  actionableIssues: number;

  blockingIssues: number;
  nonBlockingIssues: number;
}

function testHealthScore(test: DashboardTestResult): number {
  if (test.status === 'passed') {
    const hasWarning = test.annotations.some(
      annotation => annotation.type === 'warning'
    );

    return hasWarning ? 90 : 100;
  }

  switch (test.classification) {
    case 'automation-issue':
      return 90;

    case 'warning':
      return 85;

    case 'needs-investigation':
      return 70;

    case 'content-bug':
      return 65;

    case 'product-bug':
      return severityScore(test.severity);

    default:
      return severityScore(test.severity);
  }
}

function severityScore(severity: Severity): number {
  switch (severity) {
    case 'critical':
      return 20;

    case 'high':
      return 40;

    case 'medium':
      return 60;

    case 'low':
      return 75;

    case 'info':
      return 85;

    case 'none':
    default:
      return 70;
  }
}

export function analyzeHealth(
  tests: DashboardTestResult[]
): HealthSummary {
  const passed = tests.filter(
    test => test.status === 'passed'
  ).length;

  const failed = tests.filter(
    test => test.status === 'failed'
  ).length;

  const skipped = tests.filter(
    test => test.status === 'skipped'
  ).length;

  const timedOut = tests.filter(
    test => test.status === 'timedOut'
  ).length;

  const interrupted = tests.filter(
    test => test.status === 'interrupted'
  ).length;

  const flaky = tests.filter(
    test => test.retry > 0 && test.status === 'passed'
  ).length;

  const failedTests = tests.filter(test =>
    ['failed', 'timedOut', 'interrupted'].includes(
      test.status
    )
  );

  const countSeverity = (
    severity: Severity
  ): number =>
    failedTests.filter(
      test => test.severity === severity
    ).length;

  const criticalBugs = countSeverity('critical');
  const highBugs = countSeverity('high');
  const mediumBugs = countSeverity('medium');
  const lowBugs = countSeverity('low');

  const warnings = tests.filter(test => {
    const annotationWarning = test.annotations.some(
      annotation => annotation.type === 'warning'
    );

    return (
      test.classification === 'warning' ||
      test.classification === 'needs-investigation' ||
      annotationWarning
    );
  }).length;

  const actionableTestIssues =
  consolidateTestIssues(
    tests
  );

const blockingIssues =
  actionableTestIssues.filter(
    issue =>
      issue.classification ===
        'product-bug' &&
      (
        issue.severity ===
          'critical' ||
        issue.severity ===
          'high'
      )
  ).length;

const nonBlockingIssues =
  actionableTestIssues.length -
  blockingIssues;

  const health =
    tests.length === 0
      ? 0
      : Math.round(
          tests.reduce(
            (total, test) =>
              total + testHealthScore(test),
            0
          ) / tests.length
        );

  return {
  health: Math.max(0, Math.min(100, health)),

  passed,
  failed,
  skipped,
  timedOut,
  interrupted,
  flaky,

  criticalBugs,
  highBugs,
  mediumBugs,
  lowBugs,

  warnings,

  actionableIssues:
    actionableTestIssues.length,

  blockingIssues,

  nonBlockingIssues,
};
}