import fs from 'node:fs';
import path from 'node:path';

import type {
  DashboardRun,
  DashboardTestResult,
} from '../models/types';

function escapeHtml(value?: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripAnsi(
  value: string
): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-?]*[ -/]*[@-~]/g,
    ''
  );
}

function formatDuration(milliseconds?: number): string {
  const value = Number(milliseconds);

  if (!Number.isFinite(value)) {
    return '—';
  }

  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('sv-SE');
}

function releaseLabel(status?: string): string {
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

function classificationLabel(value?: string): string {
  const labels: Record<string, string> = {
    'product-bug': 'Product bug',
    'content-bug': 'Content bug',
    'automation-issue': 'Automation issue',
    'accessibility-issue': 'Accessibility issue',
    'performance-issue': 'Performance issue',
    'security-issue': 'Security issue',
    'needs-investigation': 'Needs investigation',
    warning: 'Warning',
    none: 'Passed',
  };

  return labels[value ?? ''] ?? 'Unclassified';
}

function issueHtml(
  issue: DashboardTestResult,
  index: number
): string {
  const classification =
    issue.classification ?? 'needs-investigation';

  const evidence = issue.attachments?.length
    ? `
      <div class="issue-section">
        <h4>Evidence</h4>

        <ul>
          ${issue.attachments
            .map(
              attachment => `
                <li>
                  ${escapeHtml(attachment.name)}
                  <span class="muted">
                    ${escapeHtml(attachment.contentType)}
                  </span>
                </li>
              `
            )
            .join('')}
        </ul>
      </div>
    `
    : '';

  const technicalError = issue.error?.message
    ? `
      <details>
        <summary>Technical error</summary>

       <pre>${escapeHtml(stripAnsi(issue.error.message))}</pre>
      </details>
    `
    : '';

  return `
    <article class="issue issue-${escapeHtml(classification)}">
      <div class="issue-header">
        <div>
          <span class="issue-number">Issue ${index + 1}</span>

          <h3>
            ${escapeHtml(issue.fullTitle || issue.title)}
          </h3>

          <p class="muted">
            ${escapeHtml(issue.category)}
            ·
            ${escapeHtml(issue.project)}
            ·
            ${formatDuration(issue.duration)}
          </p>
        </div>

        <div class="badges">
          <span class="badge classification">
            ${escapeHtml(classificationLabel(classification))}
          </span>

          <span class="badge severity-${escapeHtml(issue.severity)}">
            ${escapeHtml(issue.severity).toUpperCase()}
          </span>
        </div>
      </div>

      ${
        issue.classificationReason
          ? `
            <div class="issue-section">
              <h4>Finding</h4>
              <p>${escapeHtml(issue.classificationReason)}</p>
            </div>
          `
          : ''
      }

      <div class="intelligence-grid">
        <div>
          <span>Confidence</span>
          <strong>${issue.confidence ?? 0}%</strong>
        </div>

        <div>
          <span>Estimated fix</span>
          <strong>
            ${
              issue.estimatedFixMinutes != null
                ? `${issue.estimatedFixMinutes} min`
                : 'Unknown'
            }
          </strong>
        </div>

        <div>
          <span>Severity</span>
          <strong>
            ${escapeHtml(issue.severity).toUpperCase()}
          </strong>
        </div>
      </div>

      ${
        issue.userImpact
          ? `
            <div class="issue-section">
              <h4>User impact</h4>
              <p>${escapeHtml(issue.userImpact)}</p>
            </div>
          `
          : ''
      }

      ${
        issue.rootCause
          ? `
            <div class="root-cause">
              <h4>Likely root cause</h4>
              <p>${escapeHtml(issue.rootCause)}</p>
            </div>
          `
          : ''
      }

      ${
        issue.recommendation
          ? `
            <div class="recommendation">
              <h4>Recommended action</h4>
              <p>${escapeHtml(issue.recommendation)}</p>
            </div>
          `
          : ''
      }

      ${evidence}
      ${technicalError}
    </article>
  `;
}

export function buildHtmlReport(
  run: DashboardRun
): string {
  const assessment = run.releaseAssessment;

  const summary =
    run.classificationSummary ?? {
      productBugs: 0,
      contentBugs: 0,
      automationIssues: 0,
      accessibilityIssues: 0,
      performanceIssues: 0,
      securityIssues: 0,
      needsInvestigation: 0,
      warnings: 0,
    };

  const issues = run.prioritizedIssues.filter(
    issue => issue.classification !== 'none'
  );

  const browsers = Object.entries(
    run.browserStatistics ?? {}
  );

  const categories = Object.entries(
    run.categoryStatistics ?? {}
  ).sort(
    (first, second) =>
      first[1].health - second[1].health
  );

  const slowestTests = [...run.tests]
    .sort(
      (first, second) =>
        second.duration - first.duration
    )
    .slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>QA Sentinel Tyra Report</title>

  <style>
    :root {
      color-scheme: dark;

      --bg: #07101d;
      --surface: #0d192a;
      --surface-raised: #122139;
      --border: #223a5b;

      --text: #f4f7fb;
      --muted: #91a6c1;
      --accent: #79adff;

      --good: #3bd68b;
      --warning: #f3bd55;
      --danger: #ff617b;

      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;

      background:
        radial-gradient(
          circle at 10% 0%,
          rgba(80, 130, 220, 0.2),
          transparent 32%
        ),
        var(--bg);

      color: var(--text);
      line-height: 1.6;
    }

    main {
      width: min(1200px, calc(100% - 2rem));
      margin: 2rem auto;
    }

    h1,
    h2,
    h3,
    h4,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 0.4rem;
      font-size: clamp(2rem, 5vw, 3.5rem);
      letter-spacing: -0.05em;
    }

    h2 {
      margin-bottom: 1rem;
      font-size: 1.3rem;
    }

    h3 {
      margin-bottom: 0.35rem;
      font-size: 1.05rem;
    }

    h4 {
      margin-bottom: 0.35rem;
      color: var(--accent);
      font-size: 0.76rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .eyebrow {
      margin-bottom: 0.4rem;
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .muted {
      margin-bottom: 0;
      color: var(--muted);
    }

    .card {
      margin-bottom: 1rem;
      padding: 1.25rem;

      border: 1px solid var(--border);
      border-radius: 1rem;

      background:
        linear-gradient(
          145deg,
          rgba(18, 33, 57, 0.98),
          rgba(10, 22, 39, 0.98)
        );

      box-shadow:
        0 20px 55px rgba(0, 0, 0, 0.22);
    }

    .header {
      padding: 1.5rem;
    }

    .release {
      border-color:
        ${
          assessment?.status === 'ready'
            ? 'rgba(59, 214, 139, 0.45)'
            : assessment?.status === 'not-ready'
              ? 'rgba(255, 97, 123, 0.5)'
              : 'rgba(243, 189, 85, 0.45)'
        };
    }

    .release-status {
      margin-bottom: 0.65rem;
      font-size: 1.65rem;
      letter-spacing: -0.035em;
    }

    .grid {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .metric {
      min-height: 110px;

      display: flex;
      flex-direction: column;
      justify-content: space-between;

      padding: 1rem;

      border: 1px solid rgba(130, 170, 225, 0.15);
      border-radius: 0.8rem;

      background: rgba(5, 15, 28, 0.35);
    }

    .metric span,
    .intelligence-grid span {
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .metric strong {
      font-size: 1.8rem;
      letter-spacing: -0.04em;
    }

    .two-column {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.7rem;
      border-bottom:
        1px solid rgba(130, 170, 225, 0.14);
      text-align: left;
    }

    th {
      color: var(--muted);
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .issue {
      margin-bottom: 0.9rem;
      padding: 1.1rem;

      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      border-radius: 0.85rem;

      background: rgba(5, 15, 28, 0.48);
    }

    .issue-product-bug {
      border-left-color: var(--danger);
    }

    .issue-content-bug {
      border-left-color: var(--warning);
    }

    .issue-automation-issue {
      border-left-color: var(--accent);
    }

    .issue-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .issue-number {
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .badges {
      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .badge {
      padding: 0.35rem 0.65rem;
      border-radius: 999px;

      background: rgba(121, 173, 255, 0.14);
      color: #b9d4ff;

      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .severity-critical,
    .severity-high {
      background: rgba(255, 97, 123, 0.15);
      color: #ff9caf;
    }

    .severity-medium {
      background: rgba(243, 189, 85, 0.15);
      color: #ffda8a;
    }

    .severity-low,
    .severity-info,
    .severity-none {
      background: rgba(121, 173, 255, 0.14);
      color: #b9d4ff;
    }

    .intelligence-grid {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 0.7rem;

      margin-top: 0.9rem;
    }

    .intelligence-grid > div {
      padding: 0.75rem;

      border: 1px solid rgba(130, 170, 225, 0.14);
      border-radius: 0.7rem;

      background: rgba(10, 25, 45, 0.46);
    }

    .intelligence-grid strong {
      display: block;
      margin-top: 0.25rem;
    }

    .issue-section,
    .root-cause,
    .recommendation {
      margin-top: 0.9rem;
      padding: 0.8rem;

      border: 1px solid rgba(130, 170, 225, 0.13);
      border-radius: 0.7rem;

      background: rgba(10, 25, 45, 0.35);
    }

    .root-cause {
      border-color: rgba(190, 140, 255, 0.2);
      background: rgba(190, 140, 255, 0.06);
    }

    .recommendation {
      border-color: rgba(121, 173, 255, 0.2);
      background: rgba(121, 173, 255, 0.07);
    }

    .issue-section p,
    .root-cause p,
    .recommendation p {
      margin-bottom: 0;
    }

    details {
      margin-top: 0.8rem;
    }

    summary {
      color: var(--muted);
      cursor: pointer;
    }

    pre {
      overflow: auto;

      padding: 0.9rem;

      border: 1px solid rgba(255, 97, 123, 0.15);
      border-radius: 0.7rem;

      background: #06101c;
      color: #ffc0ca;

      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    footer {
      padding: 1rem 0 2rem;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 850px) {
      .grid,
      .two-column,
      .intelligence-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 600px) {
      .grid,
      .two-column,
      .intelligence-grid {
        grid-template-columns: 1fr;
      }

      .issue-header {
        flex-direction: column;
      }
    }

    @media print {
      :root {
        color-scheme: light;
      }

      body {
        background: white;
        color: #172033;
      }

      .card,
      .issue {
        break-inside: avoid;
        background: white;
        box-shadow: none;
      }
    }
  </style>
</head>

<body>
  <main>
    <header class="header card">
      <p class="eyebrow">
        QA SENTINEL TYRA
      </p>

      <h1>
        Executive QA Report
      </h1>

      <p class="muted">
        Generated ${escapeHtml(formatDate(run.finishedAt))}
        ·
        ${escapeHtml(run.environment)}
        ·
        ${run.totalTests} tests
      </p>
    </header>

    <section class="release card">
      <p class="eyebrow">
        RELEASE READINESS
      </p>

      <h2 class="release-status">
        ${escapeHtml(releaseLabel(assessment?.status))}
      </h2>

      <div class="grid">
        <div class="metric">
          <span>Quality score</span>
          <strong>${run.health}%</strong>
        </div>

        <div class="metric">
          <span>Risk</span>
          <strong>
            ${escapeHtml(
              String(assessment?.risk ?? 'unknown').toUpperCase()
            )}
          </strong>
        </div>

        <div class="metric">
          <span>Confidence</span>
          <strong>${assessment?.confidence ?? 0}%</strong>
        </div>

        <div class="metric">
          <span>Blocking issues</span>
          <strong>${assessment?.blockingIssues ?? 0}</strong>
        </div>
      </div>

      <div class="recommendation">
        <h4>Verdict</h4>

        <p>
          ${escapeHtml(
            assessment?.verdict ??
              'No automated release assessment is available.'
          )}
        </p>
      </div>

      <div class="recommendation">
        <h4>Recommended action</h4>

        <p>
          ${escapeHtml(
            assessment?.recommendedAction ??
              'Review the latest test results.'
          )}
        </p>
      </div>
    </section>

    <section class="card">
      <p class="eyebrow">
        TEST RESULTS
      </p>

      <h2>Run overview</h2>

      <div class="grid">
        <div class="metric">
          <span>Passed</span>
          <strong>${run.passed}</strong>
        </div>

        <div class="metric">
          <span>Failed</span>
          <strong>${run.failed}</strong>
        </div>

        <div class="metric">
          <span>Warnings</span>
          <strong>${run.warnings}</strong>
        </div>

        <div class="metric">
          <span>Flaky</span>
          <strong>${run.flaky}</strong>
        </div>
      </div>
    </section>

    <section class="card">
      <p class="eyebrow">
        ISSUE CLASSIFICATION
      </p>

      <h2>Issue distribution</h2>

      <div class="grid">
        <div class="metric">
          <span>Product bugs</span>
          <strong>${summary.productBugs}</strong>
        </div>

        <div class="metric">
          <span>Content bugs</span>
          <strong>${summary.contentBugs}</strong>
        </div>

        <div class="metric">
          <span>Automation issues</span>
          <strong>${summary.automationIssues}</strong>
        </div>

        <div class="metric">
          <span>Needs investigation</span>
          <strong>${summary.needsInvestigation}</strong>
        </div>
      </div>
    </section>

    <section class="two-column">
      <article class="card">
        <p class="eyebrow">PERFORMANCE</p>

        <h2>Slowest tests</h2>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Test</th>
              <th>Duration</th>
            </tr>
          </thead>

          <tbody>
            ${slowestTests
              .map(
                (test, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(test.title)}</td>
                    <td>${formatDuration(test.duration)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </article>

      <article class="card">
        <p class="eyebrow">BROWSERS</p>

        <h2>Browser matrix</h2>

        <table>
          <thead>
            <tr>
              <th>Browser</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Health</th>
            </tr>
          </thead>

          <tbody>
            ${browsers
              .map(
                ([browser, stats]) => `
                  <tr>
                    <td>${escapeHtml(browser)}</td>
                    <td>${stats.passed}</td>
                    <td>${stats.failed}</td>
                    <td>${stats.health}%</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </article>
    </section>

    <section class="card">
      <p class="eyebrow">CATEGORIES</p>

      <h2>Quality by area</h2>

      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Health</th>
          </tr>
        </thead>

        <tbody>
          ${categories
            .map(
              ([category, stats]) => `
                <tr>
                  <td>${escapeHtml(category)}</td>
                  <td>${stats.passed}</td>
                  <td>${stats.failed}</td>
                  <td>${stats.health}%</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <section class="card">
      <p class="eyebrow">
        PRIORITY QUEUE
      </p>

      <h2>
        Issues requiring attention (${issues.length})
      </h2>

      ${
        issues.length
          ? issues
              .map((issue, index) =>
                issueHtml(issue, index)
              )
              .join('')
          : `
              <p class="muted">
                No issues requiring attention were detected.
              </p>
            `
      }
    </section>

    <footer>
      QA Sentinel Tyra · Enterprise Quality Intelligence Platform
    </footer>
  </main>
</body>
</html>`;
}

export function writeHtmlReport(
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
    `qa-report-${timestamp}.html`
  );

  const latestReportFile = path.join(
    outputDirectory,
    'latest-report.html'
  );

  const html = buildHtmlReport(run);

  fs.writeFileSync(
    reportFile,
    html,
    'utf8'
  );

  fs.writeFileSync(
    latestReportFile,
    html,
    'utf8'
  );

  return reportFile;
}