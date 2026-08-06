import fs from 'node:fs';
import path from 'node:path';

import type {
  DashboardRun,
  DashboardTestResult,
  IssueClassification,
} from '../models/types';

const CLASSIFICATION_LABELS: Record<
  IssueClassification,
  string
> = {
  'product-bug': 'Product Bug',
  'content-bug': 'Content Bug',
  'automation-issue': 'Automation Issue',
  'accessibility-issue': 'Accessibility Issue',
  'performance-issue': 'Performance Issue',
  'security-issue': 'Security Issue',
  'needs-investigation': 'Needs Investigation',
  warning: 'Warning',
  none: 'Passed',
};

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) {
    return 'Unknown';
  }

  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(2)} s`
    : `${Math.round(milliseconds)} ms`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('sv-SE');
}

function escapeMarkdown(value?: string): string {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\r\n', '\n')
    .trim();
}

function releaseStatusLabel(
  status?: string
): string {
  switch (status) {
    case 'ready':
      return 'READY FOR RELEASE';

    case 'ready-with-warnings':
      return 'READY WITH WARNINGS';

    case 'not-ready':
      return 'DO NOT RELEASE';

    default:
      return 'UNKNOWN';
  }
}

function buildIssueSection(
  issue: DashboardTestResult,
  index: number
): string {
  const classification =
    issue.classification ?? 'needs-investigation';

  const lines: string[] = [
    `## ${index + 1}. ${escapeMarkdown(issue.title)}`,
    '',
    '| Field | Value |',
    '|---|---|',
    `| Classification | ${CLASSIFICATION_LABELS[classification]} |`,
    `| Severity | ${String(issue.severity).toUpperCase()} |`,
    `| Category | ${escapeMarkdown(issue.category)} |`,
    `| Project | ${escapeMarkdown(issue.project)} |`,
    `| Duration | ${formatDuration(issue.duration)} |`,
    `| File | \`${escapeMarkdown(issue.file)}:${issue.line}\` |`,
  ];

  if (issue.confidence !== undefined) {
    lines.push(
      `| Confidence | ${issue.confidence}% |`
    );
  }

  if (issue.estimatedFixMinutes !== undefined) {
    lines.push(
      `| Estimated fix | ${issue.estimatedFixMinutes} minutes |`
    );
  }

  lines.push('');

  if (issue.classificationReason) {
    lines.push(
      '### Finding',
      '',
      escapeMarkdown(issue.classificationReason),
      ''
    );
  }

  if (issue.userImpact) {
    lines.push(
      '### User impact',
      '',
      escapeMarkdown(issue.userImpact),
      ''
    );
  }

  if (issue.rootCause) {
    lines.push(
      '### Likely root cause',
      '',
      escapeMarkdown(issue.rootCause),
      ''
    );
  }

  if (issue.recommendation) {
    lines.push(
      '### Recommended action',
      '',
      escapeMarkdown(issue.recommendation),
      ''
    );
  }

  if (issue.error?.message) {
    lines.push(
      '<details>',
      '<summary>Technical error</summary>',
      '',
      '```text',
      issue.error.message.trim(),
      '```',
      '',
      '</details>',
      ''
    );
  }

  if (issue.attachments.length > 0) {
    lines.push(
      '### Evidence',
      ''
    );

    for (const attachment of issue.attachments) {
      const location = attachment.path
        ? ` — \`${escapeMarkdown(attachment.path)}\``
        : '';

      lines.push(
        `- ${escapeMarkdown(attachment.name)} (${escapeMarkdown(
          attachment.contentType
        )})${location}`
      );
    }

    lines.push('');
  }

  lines.push('---', '');

  return lines.join('\n');
}

function buildSlowestTests(
  run: DashboardRun
): string {
  const tests = [...run.tests]
    .sort(
      (first, second) =>
        second.duration - first.duration
    )
    .slice(0, 10);

  if (tests.length === 0) {
    return 'No performance data available.';
  }

  return [
    '| # | Test | Project | Duration |',
    '|---:|---|---|---:|',
    ...tests.map(
      (test, index) =>
        `| ${index + 1} | ${escapeMarkdown(
          test.title
        )} | ${escapeMarkdown(
          test.project
        )} | ${formatDuration(test.duration)} |`
    ),
  ].join('\n');
}

function buildBrowserTable(
  run: DashboardRun
): string {
  const entries = Object.entries(
    run.browserStatistics
  );

  if (entries.length === 0) {
    return 'No browser statistics available.';
  }

  return [
    '| Browser | Passed | Failed | Skipped | Health |',
    '|---|---:|---:|---:|---:|',
    ...entries.map(
      ([browser, statistics]) =>
        `| ${escapeMarkdown(browser)} | ` +
        `${statistics.passed} | ` +
        `${statistics.failed} | ` +
        `${statistics.skipped} | ` +
        `${statistics.health}% |`
    ),
  ].join('\n');
}

function buildCategoryTable(
  run: DashboardRun
): string {
  const entries = Object.entries(
    run.categoryStatistics
  ).sort(
    (first, second) =>
      first[1].health - second[1].health
  );

  if (entries.length === 0) {
    return 'No category statistics available.';
  }

  return [
    '| Category | Passed | Failed | Health |',
    '|---|---:|---:|---:|',
    ...entries.map(
      ([category, statistics]) =>
        `| ${escapeMarkdown(category)} | ` +
        `${statistics.passed} | ` +
        `${statistics.failed} | ` +
        `${statistics.health}% |`
    ),
  ].join('\n');
}

export function buildMarkdownReport(
  run: DashboardRun
): string {
  const assessment = run.releaseAssessment;
  const summary = run.classificationSummary;

  const issues = run.prioritizedIssues.filter(
    issue =>
      issue.classification !== 'none'
  );

  const metadata = run.metadata ?? {};

  const lines: string[] = [
    '# QA Sentinel Tyra Report',
    '',
    `**Generated:** ${formatDate(run.finishedAt)}`,
    '',
    '## Release Readiness',
    '',
    `> **${releaseStatusLabel(assessment?.status)}**`,
    '',
    '| Assessment | Value |',
    '|---|---|',
    `| Quality score | ${run.health}% |`,
    `| Risk | ${String(
      assessment?.risk ?? 'unknown'
    ).toUpperCase()} |`,
    `| Confidence | ${assessment?.confidence ?? 0}% |`,
    `| Blocking issues | ${assessment?.blockingIssues ?? 0} |`,
    `| Non-blocking issues | ${assessment?.nonBlockingIssues ?? 0} |`,
    '',
  ];

  if (assessment?.verdict) {
    lines.push(
      '### Verdict',
      '',
      escapeMarkdown(assessment.verdict),
      ''
    );
  }

  if (assessment?.recommendedAction) {
    lines.push(
      '### Recommended action',
      '',
      escapeMarkdown(
        assessment.recommendedAction
      ),
      ''
    );
  }

  lines.push(
    '## Run Information',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Environment | ${escapeMarkdown(run.environment)} |`,
    `| Base URL | ${escapeMarkdown(run.baseURL ?? 'Not configured')} |`,
    `| Build | ${escapeMarkdown(metadata.build ?? 'local')} |`,
    `| Branch | ${escapeMarkdown(metadata.branch ?? 'local')} |`,
    `| Commit | ${escapeMarkdown(metadata.commit ?? '—')} |`,
    `| Run ID | \`${escapeMarkdown(run.runId)}\` |`,
    `| Started | ${formatDate(run.startedAt)} |`,
    `| Finished | ${formatDate(run.finishedAt)} |`,
    '',
    '## Test Results',
    '',
    '| Result | Count |',
    '|---|---:|',
    `| Total | ${run.totalTests} |`,
    `| Passed | ${run.passed} |`,
    `| Failed | ${run.failed} |`,
    `| Skipped | ${run.skipped} |`,
    `| Timed out | ${run.timedOut} |`,
    `| Interrupted | ${run.interrupted} |`,
    `| Flaky | ${run.flaky} |`,
    '',
    '## Issue Classification',
    '',
    '| Classification | Count |',
    '|---|---:|',
    `| Product bugs | ${summary?.productBugs ?? 0} |`,
    `| Content bugs | ${summary?.contentBugs ?? 0} |`,
    `| Automation issues | ${summary?.automationIssues ?? 0} |`,
    `| Accessibility issues | ${summary?.accessibilityIssues ?? 0} |`,
    `| Performance issues | ${summary?.performanceIssues ?? 0} |`,
    `| Security issues | ${summary?.securityIssues ?? 0} |`,
    `| Needs investigation | ${summary?.needsInvestigation ?? 0} |`,
    `| Warnings | ${summary?.warnings ?? 0} |`,
    '',
    '## Performance',
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Wall-clock duration | ${formatDuration(
      run.performance.wallClockDuration
    )} |`,
    `| Total test duration | ${formatDuration(
      run.performance.totalDuration
    )} |`,
    `| Average test | ${formatDuration(
      run.performance.averageDuration
    )} |`,
    `| Median test | ${formatDuration(
      run.performance.medianDuration
    )} |`,
    `| P95 test | ${formatDuration(
      run.performance.p95Duration
    )} |`,
    '',
    '### Slowest Tests',
    '',
    buildSlowestTests(run),
    '',
    '## Browser Matrix',
    '',
    buildBrowserTable(run),
    '',
    '## Quality by Category',
    '',
    buildCategoryTable(run),
    '',
    `## Priority Issues (${issues.length})`,
    ''
  );

  if (issues.length === 0) {
    lines.push(
      'No issues requiring attention were detected.',
      ''
    );
  } else {
    issues.forEach((issue, index) => {
      lines.push(buildIssueSection(issue, index));
    });
  }

  lines.push(
    '## Final Assessment',
    '',
    assessment?.verdict
      ? escapeMarkdown(assessment.verdict)
      : 'No automated assessment is available.',
    '',
    assessment?.recommendedAction
      ? `**Next action:** ${escapeMarkdown(
          assessment.recommendedAction
        )}`
      : '',
    '',
    '---',
    '',
    '*Generated automatically by QA Sentinel Tyra.*',
    ''
  );

  return lines.join('\n');
}

export function writeMarkdownReport(
  run: DashboardRun,
  outputDirectory: string
): string {
  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  const timestamp = run.finishedAt
    .replaceAll(':', '-')
    .replaceAll('.', '-');

  const reportFile = path.join(
    outputDirectory,
    `qa-report-${timestamp}.md`
  );

  const latestReportFile = path.join(
    outputDirectory,
    'latest-report.md'
  );

  const markdown = buildMarkdownReport(run);

  fs.writeFileSync(
    reportFile,
    markdown,
    'utf8'
  );

  fs.writeFileSync(
    latestReportFile,
    markdown,
    'utf8'
  );

  return reportFile;
}