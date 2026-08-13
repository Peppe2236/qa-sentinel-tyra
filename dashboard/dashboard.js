const byId = id => document.getElementById(id);

let currentRun = null;
let currentIssues = [];
let activeSiteFilter = 'all';

const CLASSIFICATION_LABELS = {
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

const CLASSIFICATION_COLORS = {
  'product-bug': '#ff5f79',
  'content-bug': '#f1b94e',
  'automation-issue': '#70a7ff',
  'accessibility-issue': '#45d7c2',
  'performance-issue': '#ff985f',
  'security-issue': '#ff4263',
  'needs-investigation': '#bd8cff',
  warning: '#f3c760',
};

function setText(id, value) {
  const element = byId(id);

  if (element) {
    element.textContent = String(value ?? '');
  }
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.max(
    minimum,
    Math.min(maximum, Number(value) || 0)
  );
}

function formatMs(value) {
  const milliseconds = Number(value);

  if (!Number.isFinite(milliseconds)) {
    return '—';
  }

  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(2)} s`
    : `${Math.round(milliseconds)} ms`;
}

function formatDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadJson(filePath, fallback) {
  try {
    const response = await fetch(
      `${filePath}?timestamp=${Date.now()}`
    );

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.warn(`Could not load ${filePath}`, error);
    return fallback;
  }
}

function classificationLabel(classification) {
  return (
    CLASSIFICATION_LABELS[classification] ??
    'Unclassified'
  );
}

function classificationCounts(tests = []) {
  const counts = {
    productBugs: 0,
    contentBugs: 0,
    automationIssues: 0,
    accessibilityIssues: 0,
    performanceIssues: 0,
    securityIssues: 0,
    needsInvestigation: 0,
    warnings: 0,
  };

  for (const test of tests) {
    switch (test.classification) {
      case 'product-bug':
        counts.productBugs += 1;
        break;

      case 'content-bug':
        counts.contentBugs += 1;
        break;

      case 'automation-issue':
        counts.automationIssues += 1;
        break;

      case 'accessibility-issue':
        counts.accessibilityIssues += 1;
        break;

      case 'performance-issue':
        counts.performanceIssues += 1;
        break;

      case 'security-issue':
        counts.securityIssues += 1;
        break;

      case 'needs-investigation':
        counts.needsInvestigation += 1;
        break;

      case 'warning':
        counts.warnings += 1;
        break;
    }
  }

  return counts;
}

function qualityLabel(health) {
  if (health >= 95) return 'Excellent';
  if (health >= 90) return 'Very good';
  if (health >= 80) return 'Good';
  if (health >= 70) return 'Needs attention';
  return 'Needs work';
}

function renderMetadata(run) {
  const metadata = run.metadata ?? {};

  setText('build-value', metadata.build ?? 'local');
  setText('branch-value', metadata.branch ?? 'local');
  setText('commit-value', metadata.commit ?? '—');
  setText(
    'run-number-value',
    metadata.runNumber ?? run.runId?.slice(0, 8) ?? '—'
  );

  setText(
    'run-meta',
    `${run.environment ?? 'local'} · ` +
      `${run.totalTests ?? 0} tests · ` +
      formatDate(run.finishedAt)
  );
}

function renderReleaseAssessment(run) {
  const assessment = run.releaseAssessment ?? {
    status: 'ready-with-warnings',
    risk: 'unknown',
    confidence: 0,
    blockingIssues: 0,
    nonBlockingIssues: 0,
    verdict: 'No release assessment is available.',
    recommendedAction:
      'Run the latest QA test suite again.',
  };

  const labels = {
    ready: 'READY FOR RELEASE',
    'ready-with-warnings': 'READY WITH WARNINGS',
    'not-ready': 'DO NOT RELEASE',
  };

  const releaseCard = byId('release-card');
  const status =
    labels[assessment.status] ?? 'UNKNOWN STATUS';

  setText('release-status', status);
  setText(
    'release-risk',
    `${String(assessment.risk).toUpperCase()} RISK`
  );
  setText(
    'release-confidence-value',
    `${assessment.confidence ?? 0}%`
  );
  setText(
    'blocking-issues-value',
    assessment.blockingIssues ?? 0
  );
  setText(
    'non-blocking-issues-value',
    assessment.nonBlockingIssues ?? 0
  );
  setText(
    'release-risk-value',
    String(assessment.risk ?? 'unknown').toUpperCase()
  );
  setText(
    'release-verdict-text',
    assessment.verdict
  );
  setText(
    'release-action-text',
    `Recommended action: ${assessment.recommendedAction}`
  );

  if (releaseCard) {
    releaseCard.dataset.status = assessment.status;
    releaseCard.dataset.risk = assessment.risk;
  }

  const riskBadge = byId('release-risk');

  if (riskBadge) {
    riskBadge.className =
      `release-risk risk-${assessment.risk}`;
  }
}

function renderMetrics(run) {
  const isAllSites =
    activeSiteFilter === 'all';

  const siteStats =
    !isAllSites
      ? run.siteStatistics?.[
          activeSiteFilter
        ]
      : null;

  const siteTests =
    isAllSites
      ? run.tests ?? []
      : (run.tests ?? []).filter(
          test =>
            test.site ===
            activeSiteFilter
        );

  const health =
    clamp(
      siteStats?.health ??
      run.health ??
      0
    );

  const counts =
    isAllSites
      ? (
          run.classificationSummary ??
          classificationCounts(
            run.tests ?? []
          )
        )
      : classificationCounts(
          siteTests
        );

  const passed =
    siteStats?.passed ??
    run.passed ??
    0;

  const failed =
    siteStats?.failed ??
    run.failed ??
    0;

  const averageDuration =
    siteStats?.averageDuration ??
    run.performance?.averageDuration ??
    0;

  setText(
    'health-value',
    `${health}%`
  );

  setText(
    'health-label',
    qualityLabel(health)
  );

  setText(
    'passed-value',
    passed
  );

  setText(
    'failed-value',
    failed
  );

  setText(
    'critical-value',
    counts.productBugs ?? 0
  );

  setText(
    'content-value',
    counts.contentBugs ?? 0
  );

  setText(
    'automation-value',
    counts.automationIssues ?? 0
  );

  setText(
    'warnings-value',
    (counts.warnings ?? 0) +
    (counts.needsInvestigation ?? 0)
  );

  setText(
    'average-value',
    formatMs(
      averageDuration
    )
  );

  const ring =
    byId('health-ring');

  if (ring) {
    ring.style.setProperty(
      '--health-angle',
      `${health * 3.6}deg`
    );
  }

  let status;

  if (isAllSites) {
    status =
      String(
        run.status ??
        'unknown'
      );
  } else if (
    (siteStats?.failed ?? 0) > 0 ||
    (siteStats?.timedOut ?? 0) > 0 ||
    (siteStats?.interrupted ?? 0) > 0
  ) {
    status = 'failed';
  } else {
    status = 'passed';
  }

  const statusElement =
    byId('run-status');

  if (statusElement) {
    statusElement.textContent =
      status.toUpperCase();

    statusElement.style.color =
      status === 'passed'
        ? 'var(--good)'
        : 'var(--bad)';
  }
}

function renderExecutiveSummary(run) {
  const counts =
    run.classificationSummary ??
    classificationCounts(run.tests ?? []);

  const assessment = run.releaseAssessment;
  const parts = [];

  parts.push(
    `${run.passed ?? 0} of ${run.totalTests ?? 0} tests passed.`
  );

  if ((counts.productBugs ?? 0) > 0) {
    parts.push(
      `${counts.productBugs} confirmed product bug${
        counts.productBugs === 1 ? '' : 's'
      } affect functional behaviour.`
    );
  } else {
    parts.push(
      'No confirmed functional product bug was detected.'
    );
  }

  if ((counts.contentBugs ?? 0) > 0) {
    parts.push(
      `${counts.contentBugs} visible content issue${
        counts.contentBugs === 1 ? '' : 's'
      } should be corrected.`
    );
  }

  if ((counts.automationIssues ?? 0) > 0) {
    parts.push(
      `${counts.automationIssues} automation issue${
        counts.automationIssues === 1 ? '' : 's'
      } affect test reliability but are not confirmed production defects.`
    );
  }

  if (assessment?.recommendedAction) {
    parts.push(
      `Recommended next action: ${assessment.recommendedAction}`
    );
  }

  setText(
    'executive-summary-text',
    parts.join(' ')
  );
}

function renderBrowsers(stats = {}) {
  const container = byId('browser-list');

  if (!container) return;

  const entries = Object.entries(stats);

  container.innerHTML = entries.length
    ? entries
        .map(([name, item]) => {
          const health = clamp(item.health);

          return `
            <div class="progress-row">
              <span>${escapeHtml(name)}</span>

              <div class="progress">
                <span style="width:${health}%"></span>
              </div>

              <strong>
                ${item.passed ?? 0}/${item.total ?? 0}
              </strong>
            </div>
          `;
        })
        .join('')
    : `
        <div class="empty">
          No browser statistics available.
        </div>
      `;
}

function renderBrowserMatrix(stats = {}) {
  const container = byId('browser-matrix');

  if (!container) return;

  const entries = Object.entries(stats);

  container.innerHTML = entries.length
    ? `
        <div class="matrix-table">
          <div class="matrix-row matrix-header">
            <span>Browser</span>
            <span>Passed</span>
            <span>Failed</span>
            <span>Health</span>
          </div>

          ${entries
            .map(([name, item]) => `
              <div class="matrix-row">
                <strong>${escapeHtml(name)}</strong>
                <span class="matrix-good">
                  ${item.passed ?? 0}
                </span>
                <span class="matrix-bad">
                  ${item.failed ?? 0}
                </span>
                <span>
                  ${clamp(item.health)}%
                </span>
              </div>
            `)
            .join('')}
        </div>
      `
    : `
        <div class="empty">
          No browser comparison data available.
        </div>
      `;
}

function renderPerformance(performance = {}) {
  const container = byId('performance-list');

  if (!container) return;

  const rows = [
    [
      'Wall-clock duration',
      formatMs(performance.wallClockDuration),
    ],
    [
      'Average test',
      formatMs(performance.averageDuration),
    ],
    [
      'Median test',
      formatMs(performance.medianDuration),
    ],
    [
      'P95 test',
      formatMs(performance.p95Duration),
    ],
    [
      'Fastest',
      performance.fastestTest
        ? `${formatMs(
            performance.fastestTest.duration
          )} · ${performance.fastestTest.project}`
        : '—',
    ],
    [
      'Slowest',
      performance.slowestTest
        ? `${formatMs(
            performance.slowestTest.duration
          )} · ${performance.slowestTest.project}`
        : '—',
    ],
  ];

  container.innerHTML = rows
    .map(
      ([term, value]) => `
        <dt>${escapeHtml(term)}</dt>
        <dd>${escapeHtml(value)}</dd>
      `
    )
    .join('');
}

function renderSlowestTests(run) {
  const container = byId('slowest-tests-list');

  if (!container) return;

  const tests = [...(run.tests ?? [])]
    .sort(
      (first, second) =>
        Number(second.duration ?? 0) -
        Number(first.duration ?? 0)
    )
    .slice(0, 8);

  container.innerHTML = tests.length
    ? tests
        .map(
          (test, index) => `
            <div class="slow-test">
              <span class="slow-rank">
                ${index + 1}
              </span>

              <div>
                <strong>
                  ${escapeHtml(test.title)}
                </strong>

                <p class="muted">
                  ${escapeHtml(test.project)} ·
                  ${escapeHtml(test.category)}
                </p>
              </div>

              <span class="slow-duration">
                ${formatMs(test.duration)}
              </span>
            </div>
          `
        )
        .join('')
    : `
        <div class="empty">
          No performance data is available.
        </div>
      `;
}

function renderFailureDistribution(run) {
  const container = byId('failure-distribution');

  if (!container) return;

  const counts =
    run.classificationSummary ??
    classificationCounts(run.tests ?? []);

  const items = [
    ['product-bug', counts.productBugs ?? 0],
    ['content-bug', counts.contentBugs ?? 0],
    ['automation-issue', counts.automationIssues ?? 0],
    [
      'accessibility-issue',
      counts.accessibilityIssues ?? 0,
    ],
    [
      'performance-issue',
      counts.performanceIssues ?? 0,
    ],
    ['security-issue', counts.securityIssues ?? 0],
    [
      'needs-investigation',
      counts.needsInvestigation ?? 0,
    ],
    ['warning', counts.warnings ?? 0],
  ].filter(([, value]) => value > 0);

  const total = items.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  if (total === 0) {
    container.innerHTML = `
      <div class="empty">
        No classified issues were found.
      </div>
    `;
    return;
  }

  const segments = items
    .map(([classification, value]) => {
      const percentage = (value / total) * 100;
      const color =
        CLASSIFICATION_COLORS[classification];

      return `${color} 0 ${percentage}%`;
    });

  let accumulated = 0;

  const gradient = items
    .map(([classification, value]) => {
      const start = accumulated;
      const size = (value / total) * 100;
      accumulated += size;

      return `${
        CLASSIFICATION_COLORS[classification]
      } ${start}% ${accumulated}%`;
    })
    .join(', ');

  container.innerHTML = `
    <div
      class="distribution-donut"
      style="background: conic-gradient(${gradient})"
    >
      <div class="distribution-center">
        <strong>${total}</strong>
        <span>issues</span>
      </div>
    </div>

    <div class="distribution-legend">
      ${items
        .map(
          ([classification, value]) => `
            <div class="legend-row">
              <span
                class="legend-dot"
                style="background:${
                  CLASSIFICATION_COLORS[classification]
                }"
              ></span>

              <span>
                ${escapeHtml(
                  classificationLabel(classification)
                )}
              </span>

              <strong>${value}</strong>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function issueMatchesFilters(issue) {
  const search =
    byId('issue-search')?.value
      ?.trim()
      .toLowerCase() ?? '';

  const classification =
    byId('classification-filter')?.value ??
    'all';

  const severity =
    byId('severity-filter')?.value ??
    'all';

  const searchableText = [
    issue.title,
    issue.fullTitle,
    issue.category,
    issue.project,
    issue.classificationReason,
    issue.recommendation,
    issue.error?.message,
  ]
    .join(' ')
    .toLowerCase();

  const matchesSearch =
    !search || searchableText.includes(search);

  const matchesClassification =
    classification === 'all' ||
    issue.classification === classification;

  const matchesSeverity =
    severity === 'all' ||
    issue.severity === severity;

  return (
    matchesSearch &&
    matchesClassification &&
    matchesSeverity
  );
}

function renderIssues() {
  const visibleIssues =
  activeSiteFilter === 'all'
    ? currentIssues
    : currentIssues.filter(
        issue =>
          issue.site === activeSiteFilter
      );

  const container = byId('issues-list');

  if (!container) return;

  const issues = visibleIssues.filter(
    issueMatchesFilters
  );

  const siteLabel =
  activeSiteFilter === 'nation'
    ? 'Nation'
    : activeSiteFilter === 'ai-skills'
      ? 'AI Skills'
      : 'All Sites';

setText(
  'issues-site-label',
  siteLabel
);
 
  setText(
    'issue-count',
    `${issues.length} issue${
      issues.length === 1 ? '' : 's'
    }`
  );

  if (issues.length === 0) {
    container.innerHTML = `
      <div class="empty">
        No issues match the selected filters.
      </div>
    `;
    return;
  }

  container.innerHTML = issues
    .map(issue => {
      const classification =
        issue.classification ??
        'needs-investigation';

      const reason = issue.classificationReason
        ? `
            <p class="issue-reason">
              ${escapeHtml(
                issue.classificationReason
              )}
            </p>
          `
        : '';

      const recommendation = issue.recommendation
        ? `
            <p class="issue-recommendation">
              <strong>Suggested action:</strong>
              ${escapeHtml(issue.recommendation)}
            </p>
          `
        : '';

      const intelligence = [
        issue.confidence != null
          ? `Confidence: ${issue.confidence}%`
          : null,

        issue.estimatedFixMinutes != null
          ? `Estimated fix: ${issue.estimatedFixMinutes} min`
          : null,

        issue.userImpact
          ? `Impact: ${issue.userImpact}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const rootCause = issue.rootCause
        ? `
            <div class="root-cause">
              <strong>Likely root cause</strong>
              <p>${escapeHtml(issue.rootCause)}</p>
            </div>
          `
        : '';

      const technicalError = issue.error?.message
        ? `
            <details class="issue-error">
              <summary>Technical error</summary>
              <pre>${escapeHtml(
                issue.error.message
              )}</pre>
            </details>
          `
        : '';

      return `
        <article
          class="issue issue-${escapeHtml(
            classification
          )}"
        >
          <div class="issue-head">
            <div>
              <h3>
                ${escapeHtml(
                  issue.fullTitle || issue.title
                )}
              </h3>

              <p class="muted">
                ${escapeHtml(issue.category)} ·
                ${escapeHtml(issue.project)} ·
                ${formatMs(issue.duration)}
              </p>
            </div>

            <div class="issue-badges">
              <span
                class="classification classification-${escapeHtml(
                  classification
                )}"
              >
                ${escapeHtml(
                  classificationLabel(classification)
                )}
              </span>

              <span
                class="severity severity-${escapeHtml(
                  issue.severity
                )}"
              >
                ${escapeHtml(
                  issue.severity
                ).toUpperCase()}
              </span>
            </div>
          </div>

          ${reason}

          ${
            intelligence
              ? `
                  <p class="issue-intelligence">
                    ${escapeHtml(intelligence)}
                  </p>
                `
              : ''
          }

          ${rootCause}
          ${recommendation}
          ${technicalError}
        </article>
      `;
    })
    .join('');
}

function renderCategories(stats = {}) {
  const container = byId('category-list');

  if (!container) return;

  const entries = Object.entries(stats).sort(
    (first, second) =>
      Number(first[1].health ?? 0) -
      Number(second[1].health ?? 0)
  );

  container.innerHTML = entries.length
    ? entries
        .map(([name, item]) => {
          const health = clamp(item.health);

          return `
            <div class="progress-row">
              <span>${escapeHtml(name)}</span>

              <div class="progress">
                <span style="width:${health}%"></span>
              </div>

              <strong>${health}%</strong>
            </div>
          `;
        })
        .join('')
    : `
        <div class="empty">
          No category data available.
        </div>
      `;
}

function renderHistory(history = []) {
  const container = byId('history-chart');

  if (!container) return;

  const runs = history.slice(-20);

  if (runs.length === 0) {
    container.innerHTML = `
      <div class="empty">
        History appears after multiple test runs.
      </div>
    `;

    setText('history-trend', 'No trend');
    return;
  }

  container.innerHTML = runs
    .map(run => {
      const health = Math.max(
        2,
        clamp(run.health)
      );

      const date = new Date(run.finishedAt);
      const label = Number.isNaN(date.getTime())
        ? 'Unknown date'
        : date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });

      return `
        <div
          class="history-bar"
          style="height:${health}%"
          title="${escapeHtml(label)}: ${health}%"
        >
          <span>${health}</span>
        </div>
      `;
    })
    .join('');

  const first = Number(runs[0]?.health ?? 0);
  const latest = Number(
    runs[runs.length - 1]?.health ?? 0
  );
  const difference = latest - first;

  if (difference > 0) {
    setText(
      'history-trend',
      `Improved +${difference}%`
    );
  } else if (difference < 0) {
    setText(
      'history-trend',
      `Declined ${difference}%`
    );
  } else {
    setText('history-trend', 'Stable');
  }
}

function renderSummary(run) {
  const counts =
    run.classificationSummary ??
    classificationCounts(run.tests ?? []);

  const summary = [];

  if ((counts.productBugs ?? 0) > 0) {
    summary.push(
      `${counts.productBugs} confirmed product bug${
        counts.productBugs === 1 ? '' : 's'
      } require developer attention.`
    );
  } else {
    summary.push(
      'No confirmed user-impacting product bugs were detected.'
    );
  }

  if ((counts.contentBugs ?? 0) > 0) {
    summary.push(
      `${counts.contentBugs} content issue${
        counts.contentBugs === 1 ? '' : 's'
      } should be corrected.`
    );
  }

  if ((counts.automationIssues ?? 0) > 0) {
    summary.push(
      `${counts.automationIssues} Playwright automation issue${
        counts.automationIssues === 1 ? '' : 's'
      } should be updated.`
    );
  }

  const p95 = Number(
    run.performance?.p95Duration ?? 0
  );

  summary.push(
    p95 > 5000
      ? `P95 duration is ${formatMs(
          p95
        )}; slower tests deserve review.`
      : `P95 duration is ${formatMs(p95)}.`
  );

  setText('summary-text', summary.join(' '));
}

function bindFilters() {
  const controls = [
    byId('issue-search'),
    byId('classification-filter'),
    byId('severity-filter'),
  ].filter(Boolean);

  for (const control of controls) {
    control.addEventListener(
      control.tagName === 'INPUT'
        ? 'input'
        : 'change',
      renderIssues
    );
  }
}
function renderControlCenter(
  run,
  history = []
) {
  const health =
    clamp(run?.health ?? 0);

  const totalTests =
    Number(run?.totalTests ?? 0);

  const failed =
    Number(run?.failed ?? 0);

  const assessment =
    run?.releaseAssessment ?? {};

  setText(
    'control-dashboard-status',
    `${health}% HEALTH`
  );

  setText(
    'control-executive-status',
    String(
      assessment.status ??
      'READY'
    )
      .replaceAll('-', ' ')
      .toUpperCase()
  );

  setText(
    'control-markdown-status',
    `${totalTests} TESTS`
  );

  setText(
    'control-playwright-status',
    failed === 0
      ? 'ALL PASSED'
      : `${failed} FAILURE${
          failed === 1 ? '' : 'S'
        }`
  );

  setText(
    'control-json-status',
    'DATA READY'
  );

  setText(
    'control-history-status',
    `${history.length} RUN${
      history.length === 1 ? '' : 'S'
    } STORED`
  );
}

function renderSiteStatistics(siteStatistics) {
  const sites = {
    nation: {
      prefix: 'nation-site',
      cardSelector:
        '.site-health-card[data-site="nation"]',
    },

    'ai-skills': {
      prefix: 'ai-skills-site',
      cardSelector:
        '.site-health-card[data-site="ai-skills"]',
    },
  };

  for (const [siteId, config] of Object.entries(sites)) {
    const stats =
      siteStatistics?.[siteId];

    const card =
      document.querySelector(
        config.cardSelector
      );

    if (!stats) {
      setText(
        `${config.prefix}-health`,
        '--%'
      );

      setText(
        `${config.prefix}-total`,
        '--'
      );

      setText(
        `${config.prefix}-passed`,
        '--'
      );

      setText(
        `${config.prefix}-failed`,
        '--'
      );

      setText(
        `${config.prefix}-warnings`,
        '--'
      );

      setText(
        `${config.prefix}-duration`,
        '--'
      );

      const bar =
        byId(
          `${config.prefix}-health-bar`
        );

      if (bar) {
        bar.style.width = '0%';
      }

      card?.classList.remove(
        'health-good',
        'health-warning',
        'health-critical'
      );

      continue;
    }

    const health =
      Math.max(
        0,
        Math.min(
          100,
          Number(stats.health) || 0
        )
      );

    setText(
      `${config.prefix}-health`,
      `${health}%`
    );

    setText(
      `${config.prefix}-total`,
      stats.total ?? 0
    );

    setText(
      `${config.prefix}-passed`,
      stats.passed ?? 0
    );

    setText(
      `${config.prefix}-failed`,
      stats.failed ?? 0
    );

    setText(
      `${config.prefix}-warnings`,
      stats.warnings ?? 0
    );

    setText(
      `${config.prefix}-duration`,
      `${stats.averageDuration ?? 0} ms`
    );

    const bar =
      byId(
        `${config.prefix}-health-bar`
      );

    if (bar) {
      bar.style.width =
        `${health}%`;
    }

    if (card) {
      card.classList.remove(
        'health-good',
        'health-warning',
        'health-critical'
      );

      if (health >= 90) {
        card.classList.add(
          'health-good'
        );
      } else if (health >= 70) {
        card.classList.add(
          'health-warning'
        );
      } else {
        card.classList.add(
          'health-critical'
        );
      }
    }
  }
}

async function render() {
  cconst [run, history, unifiedIssues] =
  await Promise.all([
    loadJson('./data/latest-run.json', null),
    loadJson('./data/history.json', []),
    loadJson('./data/unified-issues.json', []),
  ]);

  if (!run) {
    setText(
      'run-meta',
      'No dashboard data found. Run the Playwright tests first.'
    );
    return;
  }

  currentRun = run;
  currentIssues = issues.length
  ? issues
  : run.prioritizedIssues ?? [];

  renderMetadata(run);
  renderReleaseAssessment(run);
  renderMetrics(run);

  renderSiteStatistics(
  run.siteStatistics ?? {}
);
  renderControlCenter(
  run,
  history
);
  renderExecutiveSummary(run);
  renderBrowsers(run.browserStatistics ?? {});
  renderBrowserMatrix(run.browserStatistics ?? {});
  renderPerformance(run.performance ?? {});
  renderSlowestTests(run);
  renderFailureDistribution(run);
  renderIssues();
  renderCategories(run.categoryStatistics ?? {});
  renderHistory(history);
  renderSummary(run);
}

const refreshButton = byId('refresh-button');
const AUTO_REFRESH_INTERVAL_MS = 10000;

let refreshTimer = null;
let refreshRunning = false;

function updateLiveStatus(state, message) {
  const element = byId('live-status');

  if (!element) {
    return;
  }

  const labels = {
    live: 'LIVE',
    updating: 'UPDATING',
    paused: 'PAUSED',
    offline: 'OFFLINE',
  };

  element.className = `live-status live-status-${state}`;

  element.innerHTML = `
    <span class="live-dot"></span>
    ${labels[state] ?? 'UNKNOWN'}
  `;

  element.title = message ?? '';
}

async function refreshDashboard() {
  if (refreshRunning) {
    return;
  }

  refreshRunning = true;

  const button = byId('refresh-button');
  const originalText =
    button?.textContent ?? 'Refresh';

  if (button) {
    button.disabled = true;
    button.textContent = 'Updating…';
  }

  updateLiveStatus(
    'updating',
    'Loading the latest dashboard data.'
  );

  try {
    await render();

    updateLiveStatus(
      'live',
      'Dashboard data updates automatically every 10 seconds.'
    );
  } catch (error) {
    console.error(
      'Dashboard refresh failed:',
      error
    );

    updateLiveStatus(
      'offline',
      'Dashboard data could not be refreshed.'
    );
  } finally {
    refreshRunning = false;

    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }

  refreshTimer = window.setInterval(() => {
    if (document.hidden) {
      updateLiveStatus(
        'paused',
        'Auto-refresh is paused while this tab is hidden.'
      );

      return;
    }

    refreshDashboard();
  }, AUTO_REFRESH_INTERVAL_MS);
}

if (refreshButton) {
  refreshButton.addEventListener(
    'click',
    refreshDashboard
  );
}

const quickRefreshButton =
  byId('quick-refresh-button');

if (quickRefreshButton) {
  quickRefreshButton.addEventListener(
    'click',
    refreshDashboard
  );
}

document.addEventListener(
  'visibilitychange',
  () => {
    if (!document.hidden) {
      refreshDashboard();
    }
  }
);

function bindSiteFilters() {
  document
    .querySelectorAll('.site-health-card')
    .forEach(card => {
      card.addEventListener(
        'click',
        () => {
          const site =
            card.dataset.site;

          if (!site) {
            return;
          }

          if (activeSiteFilter === site) {
            setActiveSiteFilter('all');
          } else {
            setActiveSiteFilter(site);
          }
        }
      );
    });
}

document
  .querySelectorAll('.site-health-card')
  .forEach(card => {
    card.addEventListener(
      'click',
      () => {
        const site =
          card.dataset.site;

        if (!site) {
          return;
        }

        if (activeSiteFilter === site) {
          setActiveSiteFilter('all');
        } else {
          setActiveSiteFilter(site);
        }
      }
    );
  });

  function setActiveSiteFilter(site) {
  activeSiteFilter = site;

  document
    .querySelectorAll('.site-health-card')
    .forEach(card => {
      const isActive =
        site !== 'all' &&
        card.dataset.site === site;

      card.classList.toggle(
        'site-active',
        isActive
      );
    });

 if (currentRun) {
  renderMetrics(
    currentRun
  );
}

renderIssues();
}

document
  .querySelectorAll('.site-health-card')
  .forEach(card => {
    card.addEventListener(
      'click',
      () => {
        const site =
          card.dataset.site;

        if (!site) {
          return;
        }

        if (activeSiteFilter === site) {
          setActiveSiteFilter('all');
        } else {
          setActiveSiteFilter(site);
        }
      }
    );
  });

bindFilters();
bindSiteFilters();
refreshDashboard();
startAutoRefresh();