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

function qualityLabel(health, release) {
  const status = String(release?.status ?? '');

  if (status === 'not-ready') {
    return 'Release blocked';
  }

  if (status === 'not-verified') {
    return 'Not fully verified';
  }

  if (status === 'ready-with-warnings') {
    return health >= 90
      ? 'Tests passed — warnings remain'
      : 'Needs attention';
  }

  if (health >= 95) return 'Excellent';
  if (health >= 90) return 'Very good';
  if (health >= 80) return 'Good';
  if (health >= 70) return 'Needs attention';
  return 'Needs work';
}

function notMeasuredCopy() {
  return 'Not measured this run. This is a coverage gap, not a failed check.';
}

function isSampleRun(run) {
  const kind = String(run?.metadata?.dataKind ?? '').toLowerCase();

  if (kind === 'live') {
    return false;
  }

  if (kind === 'sample') {
    return true;
  }

  if (String(run?.environment ?? '').toLowerCase() === 'sample') {
    return true;
  }

  return String(run?.runId ?? '').startsWith('sample-run');
}

function renderDataSourceBanner(run) {
  const banner = byId('sample-data-banner');

  if (!banner) {
    return;
  }

  const sample = isSampleRun(run);

  banner.hidden = !sample;
  document.body.classList.toggle('sample-data', sample);
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
    'not-verified': 'RELEASE NOT VERIFIED',
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


function discoveryArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function discoveryStatus(value) {
  return String(value ?? 'not-verified')
    .replaceAll('-', ' ')
    .toUpperCase();
}

function discoveryStatusClass(value) {
  return String(value ?? 'not-verified')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}

function discoveryPanelStatus(value) {
  switch (value) {
    case 'verified':
      return 'EVIDENCE AVAILABLE';

    case 'verified-with-warnings':
      return 'EVIDENCE WITH WARNINGS';

    case 'degraded':
      return 'EVIDENCE REQUIRES ACTION';

    default:
      return 'NOT VERIFIED';
  }
}

function discoverySafeUrl(value) {
  if (!value) {
    return '—';
  }

  try {
    const url = new URL(String(value));
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return String(value)
      .split('#')[0]
      .split('?')[0];
  }
}

function discoveryDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString();
}

function isDiscoveredRouteTest(test) {
  const file = String(test?.file ?? '')
    .replaceAll('\\', '/')
    .toLowerCase();
  const title = `${test?.title ?? ''} ${test?.fullTitle ?? ''}`
    .toLowerCase();

  return (
    file.includes('generated/discovered-pages') ||
    title.includes('automatically discovered pages')
  );
}

function discoveryEvidenceMeta(values) {
  return `
    <div class="discovery-release-evidence-meta">
      ${values
        .filter(([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ''
        )
        .map(([label, value]) => `
          <span>
            ${escapeHtml(label)}:
            <strong>${escapeHtml(value)}</strong>
          </span>
        `)
        .join('')}
    </div>
  `;
}

function discoveryEvidenceCard(item) {
  const state =
    discoveryStatusClass(item.state);

  return `
    <article
      class="discovery-release-evidence-item"
      data-state="${state}"
    >
      <div class="discovery-release-evidence-heading">
        <span>${escapeHtml(item.kind ?? 'DISCOVERY EVIDENCE')}</span>
        <strong>${escapeHtml(discoveryStatus(item.state))}</strong>
      </div>

      <h4>${escapeHtml(item.title ?? 'Untitled evidence')}</h4>

      ${discoveryEvidenceMeta([
        ['Site', item.site ?? 'unknown'],
        ['Origin', item.origin ?? 'unknown'],
        ['Collector', item.collector ?? 'unknown'],
        ['Artifact', item.artifact ?? 'not recorded'],
        ['Observed', discoveryDate(item.observedAt)],
      ])}

      <p>${escapeHtml(item.detail ?? 'No additional detail recorded.')}</p>
    </article>
  `;
}

function renderDiscoveryEvidenceList(
  id,
  items,
  emptyText
) {
  const container = byId(id);

  if (!container) {
    return;
  }

  container.innerHTML = items.length > 0
    ? items.map(discoveryEvidenceCard).join('')
    : `
      <div class="discovery-release-empty">
        ${escapeHtml(emptyText)}
      </div>
    `;
}

function renderDiscoveryReleaseReadiness(run) {
  const panel = byId('discovery-release-panel');

  if (!panel) {
    return;
  }

  const readiness = run?.discoveryReadiness ?? null;
  const tests = discoveryArray(run?.tests);
  const routeTests = tests.filter(isDiscoveredRouteTest);
  const routePassed = routeTests.filter(
    test => test.status === 'passed'
  );
  const routeFailed = routeTests.filter(
    test => test.status !== 'passed'
  );
  const findings = discoveryArray(run?.discoveryIssues);
  const apiEvidence = discoveryArray(
    run?.apiBackendAssessment?.positiveEvidence
  );

  const negativeFindings = findings.filter(finding => {
    const severity = String(finding?.severity ?? '')
      .toLowerCase();
    const priority = String(finding?.priority ?? '')
      .toUpperCase();

    return (
      severity === 'critical' ||
      severity === 'high' ||
      priority === 'P0' ||
      priority === 'P1'
    );
  });
  const warningFindings = findings.filter(
    finding => !negativeFindings.includes(finding)
  );

  const positiveItems = [
    ...routePassed.map(test => ({
      state: 'verified',
      kind: 'CURRENT ROUTE CHECK',
      title: test.title,
      site: test.site,
      origin: 'test',
      collector: test.project,
      artifact: test.file,
      observedAt: test.startedAt,
      detail:
        `HTTP route verification passed in ${test.duration ?? 0} ms.`,
    })),
    ...apiEvidence.map(evidence => ({
      state: 'verified',
      kind:
        evidence.kind === 'api-endpoint'
          ? 'API ENDPOINT'
          : 'BACKEND SERVICE',
      title:
        `${evidence.method ?? 'GET'} ${discoverySafeUrl(evidence.url)}`,
      site: evidence.site,
      origin: evidence.originSource ?? 'discovery',
      collector: evidence.evidenceOrigin ?? 'deep-discovery',
      artifact: evidence.sourceArtifact ?? 'reports/discovery',
      observedAt: evidence.observedAt,
      detail:
        `Successful first-party ${evidence.resourceType ?? 'response'} ` +
        `with HTTP ${evidence.statusCode ?? '—'}.`,
    })),
  ];

  const reviewItems = [
    ...routeFailed.map(test => ({
      state: 'negative',
      kind: 'CURRENT ROUTE CHECK',
      title: test.title,
      site: test.site,
      origin: 'test',
      collector: test.project,
      artifact: test.file,
      observedAt: test.startedAt,
      detail:
        `Route verification finished with status ${test.status ?? 'unknown'}.`,
    })),
    ...findings.map(finding => ({
      state: negativeFindings.includes(finding)
        ? 'negative'
        : 'warning',
      kind:
        `${finding.priority ?? 'P4'} · ${finding.severity ?? 'unknown'}`,
      title: finding.title,
      site: finding.site,
      origin: finding.source ?? 'discovery',
      collector: finding.evidenceOrigin ?? 'deep-discovery',
      artifact: finding.sourceArtifact ?? 'reports/discovery',
      observedAt: finding.observedAt,
      detail:
        finding.description ??
        'Discovery finding requires human review.',
    })),
  ];

  const sites = [
    ...new Set([
      ...(readiness?.sites ?? []),
      ...routeTests.map(test => test.site),
      ...apiEvidence.map(evidence => evidence.site),
      ...findings.map(finding => finding.site),
    ].filter(Boolean)),
  ].sort();

  const timestamps = [
    ...routeTests.map(test => test.startedAt),
    ...apiEvidence.map(evidence => evidence.observedAt),
    ...findings.map(finding => finding.observedAt),
  ]
    .map(value => new Date(value).getTime())
    .filter(Number.isFinite);
  const latestEvidence = timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;

  const release = run?.releaseAssessment ?? {};
  const unified = run?.unifiedDecisionAssessment ?? {};
  const gate = unified.gateSummary ?? {};
  const hasEvidence =
    positiveItems.length > 0 ||
    reviewItems.length > 0;
  const apiGaps = Number(
    gate.apiIntelligenceGaps ??
    release.apiIntelligenceGaps ??
    0
  );
  const backendGaps = Number(
    gate.backendIntelligenceGaps ??
    release.backendIntelligenceGaps ??
    0
  );

  let status = readiness?.status ?? 'verified';

  if (!readiness) {
    status = 'verified';
    if (!hasEvidence) {
      status = 'not-verified';
    } else if (
      routeFailed.length > 0 ||
      negativeFindings.length > 0
    ) {
      status = 'degraded';
    } else if (
      warningFindings.length > 0 ||
      apiGaps > 0 ||
      backendGaps > 0
    ) {
      status = 'verified-with-warnings';
    }
  }

  if (
    positiveItems.length === 0 &&
    Number(readiness?.routePositive ?? 0) > 0
  ) {
    positiveItems.push({
      state: 'verified',
      kind: 'DISCOVERY SCAN',
      title: `${readiness.routePositive} crawled routes recorded`,
      site: sites.join(' · ') || 'nation + ai-skills',
      origin: 'discovery',
      collector: 'discovery-json',
      artifact: (readiness.sourceArtifacts ?? []).join(', ') || 'reports/discovery',
      observedAt: readiness.generatedAt,
      detail:
        'Discovery JSON and scan inventory are wired into release-readiness counters even when generated route tests are not in this run.',
    });
  }

  panel.dataset.status = status;
  setText('discovery-release-status', discoveryPanelStatus(status));
  setText(
    'discovery-route-positive',
    readiness?.routePositive ?? routePassed.length
  );
  setText(
    'discovery-api-positive',
    readiness?.apiPositive ?? apiEvidence.length
  );
  setText(
    'discovery-negative-count',
    readiness?.negativeCount ?? (routeFailed.length + negativeFindings.length)
  );
  setText(
    'discovery-warning-count',
    readiness?.warningCount ?? warningFindings.length
  );
  setText('discovery-site-count', sites.length);
  setText(
    'discovery-sites',
    sites.length > 0
      ? sites.join(' · ')
      : 'No sites recorded'
  );
  setText(
    'discovery-latest-evidence',
    discoveryDate(latestEvidence)
  );

  setText(
    'discovery-release-source',
    run?.releaseDecisionSource ?? '—'
  );
  setText(
    'discovery-unified-state',
    discoveryStatus(unified.state)
  );
  setText(
    'discovery-canonical-release-state',
    discoveryStatus(release.status)
  );
  setText('discovery-api-gaps', apiGaps);
  setText('discovery-backend-gaps', backendGaps);
  setText(
    'discovery-verification-gaps',
    discoveryArray(unified.verificationGapDimensions).length > 0
      ? unified.verificationGapDimensions.join(' · ')
      : 'None recorded'
  );
  setText(
    'discovery-blocking-dimensions',
    discoveryArray(unified.blockingGateDimensions).length > 0
      ? unified.blockingGateDimensions.join(' · ')
      : 'None recorded'
  );

  renderDiscoveryEvidenceList(
    'discovery-positive-evidence',
    positiveItems,
    'No current positive discovery evidence is recorded for this run.'
  );
  renderDiscoveryEvidenceList(
    'discovery-negative-evidence',
    reviewItems,
    'No negative or warning discovery evidence is recorded for this run.'
  );
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
    qualityLabel(
      health,
      run?.releaseAssessment
    )
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
    const releaseStatus =
      String(
        run?.releaseAssessment?.status ??
        ''
      );

    statusElement.textContent =
      status === 'passed'
        ? (
            releaseStatus === 'ready'
              ? 'TESTS PASSED'
              : 'TESTS PASSED'
          )
        : status.toUpperCase();

    statusElement.style.color =
      status === 'passed' &&
      (
        releaseStatus === 'ready-with-warnings' ||
        releaseStatus === 'not-verified'
      )
        ? 'var(--warning, #f3c760)'
        : status === 'passed'
          ? 'var(--good)'
          : 'var(--bad)';
  }
}


function renderSentinelAi(run) {
  const intelligence =
    run.sentinelAi ?? null;

  const panel =
    byId('sentinel-ai-panel');

  const state =
    panel?.querySelector(
      '.sentinel-ai-state'
    );

  if (!intelligence) {
    setText(
      'sentinel-ai-confidence',
      '--%'
    );
    setText(
      'sentinel-ai-risk',
      '--'
    );
    setText(
      'sentinel-ai-priority',
      '--'
    );
    setText(
      'sentinel-ai-findings-count',
      '--'
    );
    setText(
      'sentinel-ai-summary-text',
      'Sentinel AI intelligence is not available for this run.'
    );
    setText(
      'sentinel-ai-root-cause',
      'No analysis available.'
    );
    setText(
      'sentinel-ai-user-impact',
      'No analysis available.'
    );
    setText(
      'sentinel-ai-recommendation',
      'No recommendation available.'
    );
    setText(
      'sentinel-ai-next-action',
      'No immediate action available.'
    );
    setText(
      'sentinel-ai-generated',
      '--'
    );
    setText(
      'sentinel-ai-llm-status',
      'LLM off — no key'
    );

    if (panel) {
      panel.dataset.status =
        'not-verified';
    }

    if (state) {
      state.innerHTML = `
        <span class="sentinel-ai-state-dot"></span>
        NOT VERIFIED
      `;
    }

    return;
  }

  const findings =
    Array.isArray(
      intelligence.findings
    )
      ? intelligence.findings
      : [];

  const confidence =
    clamp(
      intelligence.confidence
    );

  const releaseRisk =
    String(
      intelligence.releaseRisk ??
      'unknown'
    ).toUpperCase();

  const overallPriority =
    String(
      intelligence.overallPriority ??
      'none'
    ).toUpperCase();

  setText(
    'sentinel-ai-confidence',
    `${Math.round(confidence)}%`
  );
  setText(
    'sentinel-ai-risk',
    releaseRisk
  );
  setText(
    'sentinel-ai-priority',
    overallPriority
  );
  setText(
    'sentinel-ai-findings-count',
    findings.length
  );
  setText(
    'sentinel-ai-summary-text',
    intelligence.summary ??
      'No intelligence summary is available.'
  );
  setText(
    'sentinel-ai-root-cause',
    intelligence.likelyRootCause ??
      'No analysis available.'
  );
  setText(
    'sentinel-ai-user-impact',
    intelligence.userImpact ??
      'No analysis available.'
  );
  setText(
    'sentinel-ai-recommendation',
    intelligence.recommendation ??
      'No recommendation available.'
  );
  setText(
    'sentinel-ai-next-action',
    intelligence.nextAction ??
      'No immediate action available.'
  );
  setText(
    'sentinel-ai-generated',
    formatDate(
      intelligence.generatedAt
    )
  );

  if (panel) {
    panel.dataset.status =
      'available';
    panel.dataset.risk =
      String(
        intelligence.releaseRisk ??
        'unknown'
      );
    panel.dataset.priority =
      String(
        intelligence.overallPriority ??
        'none'
      );
    panel.dataset.llm =
      String(intelligence.llm?.status ?? 'off-no-key');
  }

  if (state) {
    const llmLabel =
      intelligence.llm?.label ??
      'Heuristic Sentinel AI';
    state.innerHTML = `
      <span class="sentinel-ai-state-dot"></span>
      ${escapeHtml(llmLabel === 'LLM off — no key' ? 'LLM OFF — NO KEY' : 'INTELLIGENCE ACTIVE')}
    `;
  }

  const llmStatus = byId('sentinel-ai-llm-status');

  if (llmStatus) {
    llmStatus.textContent =
      intelligence.llm?.label ?? 'Heuristic Sentinel AI';
  }
}


function autonomousArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function autonomousStatus(value) {
  return String(
    value ?? 'not-verified'
  )
    .replaceAll('-', ' ')
    .toUpperCase();
}

function autonomousClass(value) {
  return String(
    value ?? 'not-verified'
  )
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}

function autonomousConfidence(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? `${Math.round(numeric)}%`
    : '—';
}

function autonomousBoolean(value) {
  return value === true
    ? 'YES'
    : 'NO';
}

function setAutonomousStatus(id, value) {
  const element = byId(id);

  if (!element) {
    return;
  }

  element.textContent =
    autonomousStatus(value);
  element.dataset.status =
    autonomousClass(value);
}

function autonomousTags(
  values,
  fallback = 'None recorded'
) {
  const items = autonomousArray(values);

  if (items.length === 0) {
    return `
      <span class="autonomous-qa-none">
        ${escapeHtml(fallback)}
      </span>
    `;
  }

  return items
    .map(value => `
      <span class="autonomous-qa-tag">
        ${escapeHtml(value)}
      </span>
    `)
    .join('');
}

function autonomousList(
  values,
  fallback = 'None recorded'
) {
  const items = autonomousArray(values);

  if (items.length === 0) {
    return `
      <p class="autonomous-qa-empty-copy">
        ${escapeHtml(fallback)}
      </p>
    `;
  }

  return `
    <ul class="autonomous-qa-list">
      ${items
        .map(value => `
          <li>${escapeHtml(value)}</li>
        `)
        .join('')}
    </ul>
  `;
}

function autonomousProvenanceHtml(provenance) {
  const value = provenance ?? {};
  const groups = [
    ['Sources', value.intelligenceSources],
    ['Dimensions', value.qualityDimensions],
    ['Decision units', value.unifiedDecisionUnitIds],
    ['Issues', value.issueFingerprints],
    ['Requirements', value.requirementIds],
    ['Critical flows', value.criticalFlowIds],
    ['Flow scenarios', value.flowScenarioIds],
  ];

  const visible = groups.filter(
    ([, items]) =>
      autonomousArray(items).length > 0
  );

  if (visible.length === 0) {
    return `
      <span class="autonomous-qa-none">
        No linked evidence recorded for this item.
      </span>
    `;
  }

  return visible
    .map(([label, items]) => `
      <div class="autonomous-qa-provenance-group">
        <strong>${escapeHtml(label)}</strong>
        <div class="autonomous-qa-tags">
          ${autonomousTags(items)}
        </div>
      </div>
    `)
    .join('');
}

function autonomousFlags(flags = []) {
  return `
    <div class="autonomous-qa-flags">
      ${flags
        .map(([label, value, safeValue]) => {
          const isSafe =
            value === safeValue;

          return `
            <span class="${isSafe ? 'is-safe' : 'is-review'}">
              ${escapeHtml(label)}:
              ${escapeHtml(autonomousBoolean(value))}
            </span>
          `;
        })
        .join('')}
    </div>
  `;
}

function autonomousMeta(items = []) {
  return `
    <div class="autonomous-qa-card-meta">
      ${items
        .filter(([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ''
        )
        .map(([label, value]) => `
          <span>
            ${escapeHtml(label)}:
            <strong>${escapeHtml(value)}</strong>
          </span>
        `)
        .join('')}
    </div>
  `;
}

function autonomousCard({
  title,
  eyebrow,
  status,
  meta = [],
  body = '',
  flags = [],
  provenance,
}) {
  return `
    <article class="autonomous-qa-item">
      <div class="autonomous-qa-item-heading">
        <div>
          <span>${escapeHtml(eyebrow ?? 'ADVISORY CANDIDATE')}</span>
          <h4>${escapeHtml(title ?? 'Untitled advisory item')}</h4>
        </div>

        ${status
          ? `<strong data-status="${autonomousClass(status)}">${escapeHtml(autonomousStatus(status))}</strong>`
          : ''}
      </div>

      ${autonomousMeta(meta)}
      ${body}
      ${flags.length > 0
        ? autonomousFlags(flags)
        : ''}

      <div class="autonomous-qa-item-provenance">
        <span>Evidence provenance</span>
        ${autonomousProvenanceHtml(provenance)}
      </div>
    </article>
  `;
}

function renderAutonomousCollection(
  id,
  items,
  renderer,
  emptyText
) {
  const container = byId(id);

  if (!container) {
    return;
  }

  const values = autonomousArray(items);

  container.innerHTML = values.length > 0
    ? values.map(renderer).join('')
    : `
      <div class="autonomous-qa-empty">
        ${escapeHtml(emptyText)}
      </div>
    `;
}

function renderAutonomousActions(actions) {
  renderAutonomousCollection(
    'autonomous-qa-actions',
    actions,
    action => autonomousCard({
      title: action.title,
      eyebrow: action.kind,
      status: action.state,
      meta: [
        ['Authority', action.authority],
        ['Confidence', autonomousConfidence(action.confidence)],
      ],
      body: `
        <p>${escapeHtml(action.rationale ?? 'No rationale recorded.')}</p>
      `,
      flags: [
        ['Executable', action.executable, false],
      ],
      provenance: action.provenance,
    }),
    'No advisory action candidates were produced for this run.'
  );
}

function renderAutonomousTestSelection(assessment = {}) {
  setAutonomousStatus(
    'autonomous-qa-test-selection-status',
    assessment.status
  );
  setText(
    'autonomous-qa-test-selection-candidates',
    assessment.candidateCount ?? 0
  );
  setText(
    'autonomous-qa-selected-tests',
    assessment.selectedTestCount ?? 0
  );

  renderAutonomousCollection(
    'autonomous-qa-test-selection-items',
    assessment.candidates,
    candidate => autonomousCard({
      title: candidate.title,
      eyebrow: `Test selection · ${candidate.site ?? 'unknown site'}`,
      status: candidate.evidenceState,
      meta: [
        ['Priority', candidate.priority ?? 'none'],
        ['Disposition', candidate.disposition ?? 'none'],
        ['Confidence', autonomousConfidence(candidate.confidence)],
        ['File', candidate.file ?? 'unknown'],
      ],
      body: `
        <div class="autonomous-qa-subsection">
          <span>Selection reasons</span>
          <div class="autonomous-qa-tags">
            ${autonomousTags(candidate.reasons)}
          </div>
        </div>

        <div class="autonomous-qa-subsection">
          <span>Environment variants</span>
          ${autonomousList(
            autonomousArray(candidate.variants).map(variant =>
              `${variant.project} · ${variant.browserFamily} · ${variant.profile} · ${variant.status}`
            )
          )}
        </div>
      `,
      flags: [
        ['Risk eligible', candidate.riskEligible, false],
      ],
      provenance: candidate.provenance,
    }),
    'No risk-based test-selection candidates are available.'
  );
}

function renderAutonomousExecutionPlan(assessment = {}) {
  setAutonomousStatus(
    'autonomous-qa-execution-plan-status',
    assessment.status
  );
  setText('autonomous-qa-plan-steps', assessment.stepCount ?? 0);
  setText('autonomous-qa-planned-tests', assessment.plannedTestCount ?? 0);
  setText('autonomous-qa-plan-phases', autonomousArray(assessment.phases).length);

  renderAutonomousCollection(
    'autonomous-qa-execution-plan-items',
    assessment.steps,
    step => autonomousCard({
      title: step.title,
      eyebrow: `Step ${step.order ?? '—'} · ${step.phase ?? 'unassigned'}`,
      status: step.evidenceState,
      meta: [
        ['Priority', step.priority ?? 'none'],
        ['Disposition', step.disposition ?? 'none'],
        ['Site', step.site ?? 'unknown'],
        ['File', step.file ?? 'unknown'],
      ],
      body: `
        <p>${escapeHtml(step.rationale ?? 'No planning rationale recorded.')}</p>
        <div class="autonomous-qa-subsection">
          <span>Projects</span>
          <div class="autonomous-qa-tags">${autonomousTags(step.projects)}</div>
        </div>
        <div class="autonomous-qa-subsection">
          <span>Test ids</span>
          <div class="autonomous-qa-tags">${autonomousTags(step.testIds)}</div>
        </div>
      `,
      flags: [
        ['Risk eligible', step.riskEligible, false],
        ['Executable', step.executable, false],
      ],
      provenance: step.provenance,
    }),
    'No advisory execution-plan steps are available.'
  );
}

function renderAutonomousFailureReproduction(assessment = {}) {
  setAutonomousStatus('autonomous-qa-failure-status', assessment.status);
  setText('autonomous-qa-recipe-count', assessment.recipeCount ?? 0);
  setText('autonomous-qa-failed-test-count', assessment.failedTestCount ?? 0);
  setText('autonomous-qa-attachment-count', assessment.attachmentCount ?? 0);

  renderAutonomousCollection(
    'autonomous-qa-failure-items',
    assessment.recipes,
    recipe => autonomousCard({
      title: recipe.title,
      eyebrow: `Recipe ${recipe.order ?? '—'} · ${recipe.phase ?? 'unassigned'}`,
      status: 'candidate',
      meta: [
        ['Site', recipe.site ?? 'unknown'],
        ['Evidence', recipe.evidenceCount ?? 0],
        ['Attachments', recipe.attachmentCount ?? 0],
        ['Confidence', autonomousConfidence(recipe.confidence)],
        ['File', recipe.file ?? 'unknown'],
      ],
      body: `
        <div class="autonomous-qa-subsection">
          <span>Reproduction instructions</span>
          ${autonomousList(recipe.instructions, 'No instructions recorded.')}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Projects</span>
          <div class="autonomous-qa-tags">${autonomousTags(recipe.projects)}</div>
        </div>
      `,
      flags: [
        ['Executable', recipe.executable, false],
      ],
      provenance: recipe.provenance,
    }),
    'No failed-test reproduction recipes are required for this run.'
  );
}

function renderAutonomousVerification(assessment = {}) {
  setAutonomousStatus('autonomous-qa-verification-status', assessment.status);
  setText('autonomous-qa-verification-plans', assessment.planCount ?? 0);
  setText('autonomous-qa-verification-targets', assessment.targetTestCount ?? 0);
  setText('autonomous-qa-awaiting-evidence', assessment.awaitingEvidenceCount ?? 0);
  setText('autonomous-qa-verified-plans', assessment.verifiedPlanCount ?? 0);

  renderAutonomousCollection(
    'autonomous-qa-verification-items',
    assessment.plans,
    plan => autonomousCard({
      title: plan.title,
      eyebrow: `Verification ${plan.order ?? '—'} · ${plan.phase ?? 'unassigned'}`,
      status: plan.verificationState,
      meta: [
        ['Site', plan.site ?? 'unknown'],
        ['Targets', autonomousArray(plan.testIds).length],
        ['File', plan.file ?? 'unknown'],
      ],
      body: `
        <div class="autonomous-qa-subsection">
          <span>Verification criteria</span>
          ${autonomousList(plan.criteria, 'No criteria recorded.')}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Evidence expectations</span>
          ${autonomousList(
            autonomousArray(plan.expectations).map(expectation =>
              `${expectation.project} · ${expectation.browserFamily} · ${expectation.profile}: ${expectation.previousStatus} → ${expectation.expectedStatus}`
            ),
            'No expectations recorded.'
          )}
        </div>
      `,
      flags: [
        ['Requires new evidence', plan.requiresNewEvidence, false],
        ['Verified', plan.verified, true],
        ['Release update allowed', plan.releaseDecisionUpdateAllowed, false],
        ['Executable', plan.executable, false],
      ],
      provenance: plan.provenance,
    }),
    'No verification plans are required for this run.'
  );
}

function renderAutonomousChangeImpact(assessment = {}) {
  setAutonomousStatus('autonomous-qa-change-impact-status', assessment.status);
  setText('autonomous-qa-impact-candidates', assessment.candidateCount ?? 0);
  setText('autonomous-qa-impact-targets', assessment.targetTestCount ?? 0);
  setText('autonomous-qa-impact-sites', assessment.affectedSiteCount ?? 0);
  setText('autonomous-qa-impact-projects', assessment.affectedProjectCount ?? 0);
  setText('autonomous-qa-confirmed-impact', assessment.confirmedImpactCount ?? 0);

  renderAutonomousCollection(
    'autonomous-qa-change-impact-items',
    assessment.candidates,
    candidate => autonomousCard({
      title: candidate.title,
      eyebrow: `Impact ${candidate.order ?? '—'} · ${candidate.phase ?? 'unassigned'}`,
      status: candidate.state,
      meta: [
        ['Priority', candidate.priority ?? 'none'],
        ['Disposition', candidate.disposition ?? 'none'],
        ['Evidence state', candidate.evidenceState ?? 'none'],
        ['Confidence', autonomousConfidence(candidate.confidence)],
        ['File', candidate.file ?? 'unknown'],
      ],
      body: `
        <div class="autonomous-qa-subsection">
          <span>Potential scope</span>
          <div class="autonomous-qa-tags">
            ${autonomousTags([
              ...autonomousArray(candidate.scope?.sites),
              ...autonomousArray(candidate.scope?.projects),
              ...autonomousArray(candidate.scope?.qualityDimensions),
            ])}
          </div>
        </div>
        <div class="autonomous-qa-subsection">
          <span>Rationale</span>
          ${autonomousList(candidate.rationale, 'No rationale recorded.')}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Human review checklist</span>
          ${autonomousList(candidate.reviewChecklist, 'No checklist recorded.')}
        </div>
      `,
      flags: [
        ['Change evidence available', candidate.changeEvidenceAvailable, true],
        ['Impact confirmed', candidate.impactConfirmed, true],
        ['Requires human review', candidate.requiresHumanReview, false],
        ['Release update allowed', candidate.releaseDecisionUpdateAllowed, false],
        ['Executable', candidate.executable, false],
      ],
      provenance: candidate.provenance,
    }),
    'No potential change-impact targets are available.'
  );
}

function autonomousBaseline(assessment) {
  if (!assessment?.baselineRunId) {
    return 'No canonical baseline available';
  }

  return `${assessment.baselineRunId} · ${formatDate(assessment.baselineFinishedAt)}`;
}

function renderAutonomousQualityDrift(assessment = {}) {
  setAutonomousStatus('autonomous-qa-drift-status', assessment.status);
  setText('autonomous-qa-drift-baseline', autonomousBaseline(assessment));
  setText('autonomous-qa-drift-signals', assessment.signalCount ?? 0);
  setText('autonomous-qa-drift-regressions', assessment.potentialRegressionCount ?? 0);
  setText('autonomous-qa-drift-improvements', assessment.potentialImprovementCount ?? 0);
  setText('autonomous-qa-drift-changed', assessment.changedSignalCount ?? 0);
  setText('autonomous-qa-drift-stable', assessment.stableSignalCount ?? 0);
  setText('autonomous-qa-confirmed-drift', assessment.confirmedDriftCount ?? 0);

  renderAutonomousCollection(
    'autonomous-qa-drift-items',
    assessment.signals,
    signal => autonomousCard({
      title: signal.summary,
      eyebrow: signal.kind,
      status: signal.direction,
      meta: [
        ['Baseline', signal.baselineValue ?? 'unknown'],
        ['Current', signal.currentValue ?? 'unknown'],
        ['Confidence', autonomousConfidence(signal.confidence)],
      ],
      body: `
        <div class="autonomous-qa-subsection">
          <span>Added evidence ids</span>
          <div class="autonomous-qa-tags">${autonomousTags(signal.addedIds)}</div>
        </div>
        <div class="autonomous-qa-subsection">
          <span>Removed evidence ids</span>
          <div class="autonomous-qa-tags">${autonomousTags(signal.removedIds)}</div>
        </div>
      `,
      flags: [
        ['Historical evidence', signal.historicalEvidenceAvailable, true],
        ['Drift confirmed', signal.driftConfirmed, false],
        ['Requires human review', signal.requiresHumanReview, false],
        ['Release update allowed', signal.releaseDecisionUpdateAllowed, false],
        ['Executable', signal.executable, false],
      ],
      provenance: signal.provenance,
    }),
    assessment.status === 'no-baseline'
      ? 'No pairwise baseline is available; no trend is claimed.'
      : 'No pairwise quality-drift signals are available.'
  );
}

function renderAutonomousInvestigation(assessment = {}) {
  setAutonomousStatus('autonomous-qa-investigation-status', assessment.status);
  setText('autonomous-qa-investigation-baseline', autonomousBaseline(assessment));
  setText('autonomous-qa-case-count', assessment.caseCount ?? 0);
  setText('autonomous-qa-open-cases', assessment.openCaseCount ?? 0);
  setText('autonomous-qa-investigation-units', assessment.linkedDecisionUnitCount ?? 0);
  setText('autonomous-qa-hypothesis-count', assessment.hypothesisCount ?? 0);
  setText('autonomous-qa-confirmed-causes', assessment.confirmedRootCauseCount ?? 0);
  setText('autonomous-qa-remediation-count', assessment.remediationAuthorizedCount ?? 0);

  renderAutonomousCollection(
    'autonomous-qa-investigation-items',
    assessment.cases,
    investigation => autonomousCard({
      title: investigation.title,
      eyebrow: `Case ${investigation.order ?? '—'} · ${investigation.signalKind ?? 'unknown signal'}`,
      status: investigation.state,
      meta: [
        ['Direction', investigation.signalDirection ?? 'unknown'],
        ['Baseline', investigation.baselineValue ?? 'unknown'],
        ['Current', investigation.currentValue ?? 'unknown'],
        ['Confidence', autonomousConfidence(investigation.confidence)],
      ],
      body: `
        <div class="autonomous-qa-subsection">
          <span>Unconfirmed hypotheses</span>
          ${autonomousList(
            autonomousArray(investigation.hypotheses).map(hypothesis =>
              `${hypothesis.text}${hypothesis.rootCauseLayer ? ` · layer: ${hypothesis.rootCauseLayer}` : ''} · confirmed: ${autonomousBoolean(hypothesis.confirmed)}`
            ),
            'No hypotheses recorded.'
          )}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Recommendations</span>
          ${autonomousList(investigation.recommendations)}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Investigation questions</span>
          ${autonomousList(investigation.investigationQuestions)}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Investigation steps</span>
          ${autonomousList(investigation.investigationSteps)}
        </div>
        <div class="autonomous-qa-subsection">
          <span>Exit criteria</span>
          ${autonomousList(investigation.exitCriteria)}
        </div>
      `,
      flags: [
        ['Root cause confirmed', investigation.rootCauseConfirmed, true],
        ['Remediation authorized', investigation.remediationAuthorized, false],
        ['Requires human review', investigation.requiresHumanReview, false],
        ['Release update allowed', investigation.releaseDecisionUpdateAllowed, false],
        ['Executable', investigation.executable, false],
      ],
      provenance: investigation.provenance,
    }),
    assessment.status === 'no-baseline'
      ? 'No canonical baseline is available for investigation planning.'
      : 'No drift signals require an investigation case for this run.'
  );
}

function renderAutonomousRemediation(assessment = {}) {
  setAutonomousStatus('autonomous-qa-remediation-status', assessment.status);
  setText('autonomous-qa-remediation-items-count', assessment.itemCount ?? 0);
  setText(
    'autonomous-qa-remediation-path',
    assessment.markdownPath ?? 'reports/remediation.md'
  );

  renderAutonomousCollection(
    'autonomous-qa-remediation-items',
    assessment.items,
    item => autonomousCard({
      title: item.title,
      eyebrow: item.kind ?? 'developer',
      status: 'local-report',
      meta: [
        ['Site', item.site ?? 'unknown'],
        ['File', item.file ?? 'unknown'],
        ['Route', item.route ?? '—'],
      ],
      body: `
        <p>${escapeHtml(item.suggestedFix ?? 'No suggested fix recorded.')}</p>
      `,
      flags: [
        ['Owner developer', true, true],
        ['Production write', false, false],
      ],
      provenance: {},
    }),
    assessment.status === 'disabled'
      ? 'Local remediation reports are off (QA_AUTONOMOUS_REMEDIATION=0).'
      : 'No developer-owned copy, theme, or header remediations in this run.'
  );
}

function renderAutonomousReleaseUpdate(assessment = {}) {
  setAutonomousStatus('autonomous-qa-release-update-status', assessment.status);
  setText('autonomous-qa-release-verdict', assessment.verdict ?? '—');
  setText('autonomous-qa-release-changed', assessment.changedCount ?? 0);
  setText(
    'autonomous-qa-release-next',
    assessment.nextAction ?? 'Review the human pack before any product release.'
  );

  const changes = Array.isArray(assessment.changed)
    ? assessment.changed
    : [];

  renderAutonomousCollection(
    'autonomous-qa-release-update-items',
    changes,
    change => autonomousCard({
      title: change,
      eyebrow: 'vs last history.json',
      status: assessment.status,
      meta: [
        ['Previous', assessment.previousStatus ?? 'none'],
      ],
      body: '',
      flags: [
        ['Human review required', true, false],
        ['Deploys product', false, false],
      ],
      provenance: {},
    }),
    assessment.status === 'no-baseline'
      ? 'No prior history.json entry; this run is the baseline.'
      : 'No release-update notes for this run.'
  );
}

function renderAutonomousQa(run) {
  const panel = byId('autonomous-qa-panel');

  if (!panel) {
    return;
  }

  const assessment =
    run?.autonomousQaAssessment ?? null;

  if (!assessment) {
    panel.dataset.status = 'not-verified';
    setText('autonomous-qa-capability', 'NOT VERIFIED');
    setText('autonomous-qa-unified-state', '—');
    setText('autonomous-qa-linked-units', 0);
    setText('autonomous-qa-action-count', 0);
    setText('autonomous-qa-release-source', '—');
    setText('autonomous-qa-execution', 'DISABLED BY POLICY');
    setText(
      'autonomous-qa-reason',
      'Autonomous QA assessment is not available for this run.'
    );

    const provenance = byId('autonomous-qa-provenance');
    if (provenance) {
      provenance.innerHTML = autonomousProvenanceHtml({});
    }

    renderAutonomousActions([]);
    renderAutonomousTestSelection({ status: 'not-verified' });
    renderAutonomousExecutionPlan({ status: 'not-verified' });
    renderAutonomousFailureReproduction({ status: 'not-verified' });
    renderAutonomousVerification({ status: 'not-verified' });
    renderAutonomousChangeImpact({ status: 'not-verified' });
    renderAutonomousQualityDrift({ status: 'not-verified' });
    renderAutonomousInvestigation({ status: 'not-verified' });
    renderAutonomousRemediation({ status: 'not-verified' });
    renderAutonomousReleaseUpdate({ status: 'not-verified' });
    return;
  }

  const executionEnabled =
    assessment.executionEnabled === true;
  const authority =
    String(assessment.authority ?? 'advisory-only');

  panel.dataset.status =
    autonomousClass(assessment.capabilityStatus);
  panel.dataset.executionEnabled =
    String(executionEnabled);

  setText('autonomous-qa-authority', autonomousStatus(authority));
  setText('autonomous-qa-capability', autonomousStatus(assessment.capabilityStatus));
  setText('autonomous-qa-unified-state', autonomousStatus(assessment.unifiedDecisionState));
  setText('autonomous-qa-linked-units', assessment.linkedDecisionUnitCount ?? 0);
  setText('autonomous-qa-action-count', autonomousArray(assessment.candidateActions).length);
  setText('autonomous-qa-release-source', assessment.releaseDecisionSource ?? '—');
  setText(
    'autonomous-qa-execution',
    executionEnabled
      ? 'UNEXPECTEDLY ENABLED'
      : 'DISABLED BY POLICY'
  );
  setText(
    'autonomous-qa-reason',
    assessment.reason ?? 'No assessment reason was recorded.'
  );

  const executionCard = byId('autonomous-qa-execution-card');
  const safety = byId('autonomous-qa-safety');

  executionCard?.classList.toggle(
    'autonomous-qa-execution-safe',
    !executionEnabled
  );
  executionCard?.classList.toggle(
    'autonomous-qa-execution-alert',
    executionEnabled
  );
  safety?.classList.toggle(
    'autonomous-qa-safety-alert',
    executionEnabled
  );

  setText(
    'autonomous-qa-safety-text',
    executionEnabled
      ? 'Safety contract violation: autonomous execution was reported as enabled. This dashboard still performs no execution and requires immediate human review.'
      : (
          assessment.policySummary ??
          'Disabled by policy (QA_AUTONOMOUS_EXECUTION). Production writes stay off. First-party cookie/consent clicks are on. Paid captcha solver stays off unless SENTINEL_CAPTCHA_SOLVER_KEY is set. Every item below is advisory and requires explicit human action.'
        )
  );

  const provenance = byId('autonomous-qa-provenance');
  if (provenance) {
    provenance.innerHTML =
      autonomousProvenanceHtml(assessment.provenance);
  }

  renderAutonomousActions(assessment.candidateActions);
  renderAutonomousTestSelection(assessment.testSelection);
  renderAutonomousExecutionPlan(assessment.executionPlan);
  renderAutonomousFailureReproduction(assessment.failureReproduction);
  renderAutonomousVerification(assessment.verification);
  renderAutonomousChangeImpact(assessment.changeImpact);
  renderAutonomousQualityDrift(assessment.qualityDrift);
  renderAutonomousInvestigation(assessment.investigation);
  renderAutonomousRemediation(assessment.remediationReports);
  renderAutonomousReleaseUpdate(assessment.releaseUpdate);
}


function renderUxUi(run) {
  const panel =
    byId('ux-ui-panel');

  if (!panel) {
    return;
  }


  const assessment =
    run?.uxUiAssessment;

  const release =
    run?.releaseAssessment ??
    {};


  const areaContainer =
    byId('ux-ui-areas');


  const STATUS_LABELS = {
    healthy:
      'HEALTHY',

    degraded:
      'DEGRADED',

    poor:
      'POOR',

    'not-verified':
      'NOT VERIFIED',
  };


  const AREA_LABELS = {
    usability:
      'Usability',

    navigation:
      'Navigation',

    interaction:
      'Interaction',

    'forms-validation':
      'Forms & Validation',

    accessibility:
      'Accessibility',

    'visual-stability':
      'Visual Stability',

    'responsive-usability':
      'Responsive Usability',

    'content-clarity':
      'Content Clarity',
  };


  const AREA_ORDER = [
    'usability',
    'navigation',
    'interaction',
    'forms-validation',
    'accessibility',
    'visual-stability',
    'responsive-usability',
    'content-clarity',
  ];


  function safeStatus(value) {
    const normalized =
      String(
        value ??
        'not-verified'
      ).toLowerCase();

    return (
      Object.prototype.hasOwnProperty.call(
        STATUS_LABELS,
        normalized
      )
        ? normalized
        : 'not-verified'
    );
  }


  function listText(
    values,
    fallback = 'None recorded'
  ) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return fallback;
    }

    return values
      .map(
        value =>
          String(value)
      )
      .join(' · ');
  }


  function numericText(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '—';
  }


  // This branch intentionally supports
  // pre-Milestone-5 dashboard data.
  if (
    !assessment ||
    typeof assessment !== 'object'
  ) {
    panel.dataset.status =
      'not-verified';

    setText(
      'ux-ui-status',
      'AWAITING FRESH QA RUN'
    );

    setText(
      'ux-ui-score',
      '—'
    );

    setText(
      'ux-ui-evidence',
      '—'
    );

    setText(
      'ux-ui-issue-count',
      '—'
    );

    setText(
      'ux-ui-blockers',
      '—'
    );

    setText(
      'ux-ui-gaps',
      '—'
    );

    setText(
      'ux-ui-source-coverage',
      'No UX/UI assessment in this run'
    );

    setText(
      'ux-ui-browser-scope',
      '—'
    );

    setText(
      'ux-ui-profile-scope',
      '—'
    );


    if (areaContainer) {
      areaContainer.innerHTML =
        AREA_ORDER
          .map(
            area => `
              <article
                class="ux-ui-area-card"
                data-status="not-verified"
              >
                <div class="ux-ui-area-card-header">
                  <strong>
                    ${escapeHtml(
                      AREA_LABELS[area]
                    )}
                  </strong>

                  <span>
                    NOT GENERATED
                  </span>
                </div>

                <p>
                  Awaiting a fresh QA run.
                </p>
              </article>
            `
          )
          .join('');
    }

    return;
  }


  const status =
    safeStatus(
      assessment.status
    );


  panel.dataset.status =
    status;


  setText(
    'ux-ui-status',
    STATUS_LABELS[status]
  );


  const score =
    Number(
      assessment.score
    );


  setText(
    'ux-ui-score',
    status === 'not-verified'
      ? 'Not measured'
      : Number.isFinite(score)
        ? `${Math.round(score)}%`
        : '—'
  );


  setText(
    'ux-ui-evidence',
    numericText(
      assessment.evidenceCount
    )
  );


  setText(
    'ux-ui-issue-count',
    numericText(
      assessment.issueCount
    )
  );


  setText(
    'ux-ui-blockers',
    numericText(
      release.blockingUxAreas
    )
  );


  setText(
    'ux-ui-gaps',
    numericText(
      release.uxUiGaps
    )
  );


  setText(
    'ux-ui-source-coverage',
    listText(
      assessment.sourceCoverage,
      'No verified sources'
    )
  );


  setText(
    'ux-ui-browser-scope',
    listText(
      assessment.affectedBrowsers
    )
  );


  setText(
    'ux-ui-profile-scope',
    listText(
      assessment.affectedProfiles
    )
  );


  if (!areaContainer) {
    return;
  }


  const areas =
    Array.isArray(
      assessment.areas
    )
      ? assessment.areas
      : [];


  areaContainer.innerHTML =
    AREA_ORDER
      .map(
        areaId => {

          const area =
            areas.find(
              item =>
                item?.area ===
                areaId
            );

          const areaStatus =
            safeStatus(
              area?.status
            );

          if (!area || areaStatus === 'not-verified') {
            return `
              <article
                class="ux-ui-area-card"
                data-status="not-verified"
              >
                <div class="ux-ui-area-card-header">
                  <strong>
                    ${escapeHtml(
                      AREA_LABELS[areaId]
                    )}
                  </strong>

                  <span>
                    NOT MEASURED
                  </span>
                </div>

                <p>
                  ${escapeHtml(notMeasuredCopy())}
                </p>
              </article>
            `;
          }


          const areaScore =
            Number(
              area.score
            );


          const severityText = [
            `C ${Number(
              area.critical ?? 0
            )}`,

            `H ${Number(
              area.high ?? 0
            )}`,

            `M ${Number(
              area.medium ?? 0
            )}`,

            `L ${Number(
              area.low ?? 0
            )}`,
          ].join(' · ');


          return `
            <article
              class="ux-ui-area-card"
              data-status="${escapeHtml(
                areaStatus
              )}"
            >
              <div class="ux-ui-area-card-header">

                <strong>
                  ${escapeHtml(
                    AREA_LABELS[areaId]
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    STATUS_LABELS[
                      areaStatus
                    ]
                  )}
                </span>

              </div>


              <div class="ux-ui-area-score">

                <b>
                  ${
                    Number.isFinite(
                      areaScore
                    )
                      ? `${Math.round(
                          areaScore
                        )}%`
                      : '—'
                  }
                </b>

                <small>
                  ${escapeHtml(
                    severityText
                  )}
                </small>

              </div>


              <div class="ux-ui-area-meta">

                <span>
                  Evidence
                  <strong>
                    ${Number(
                      area.evidenceCount ??
                      0
                    )}
                  </strong>
                </span>

                <span>
                  Issues
                  <strong>
                    ${Number(
                      area.issueCount ??
                      0
                    )}
                  </strong>
                </span>

              </div>


              <p>
                Sources:
                ${escapeHtml(
                  listText(
                    area.evidenceSources,
                    'None'
                  )
                )}
              </p>

            </article>
          `;
        }
      )
      .join('');
}



function renderSecurityPerformance(run) {
  const panel =
    byId('security-performance-panel');

  if (!panel) {
    return;
  }


  const assessment =
    run?.securityPerformanceAssessment;

  const release =
    run?.releaseAssessment ??
    {};


  const securityContainer =
    byId('sp-security-areas');

  const performanceContainer =
    byId('sp-performance-areas');


  const STATUS_LABELS = {
    healthy:
      'HEALTHY',

    degraded:
      'DEGRADED',

    poor:
      'POOR',

    critical:
      'CRITICAL',

    'not-verified':
      'NOT VERIFIED',

    'not-observed':
      'NOT OBSERVED',
  };


  const SECURITY_LABELS = {
    authentication:
      'Authentication',

    authorization:
      'Authorization',

    'content-security-policy':
      'Content Security Policy',

    'security-headers':
      'Security Headers',

    'session-cookies':
      'Session / Cookies',

    'data-exposure':
      'Data Exposure',

    transport:
      'Transport Security',

    'dependency-security':
      'Dependency Security',
  };


  const PERFORMANCE_LABELS = {
    'test-duration':
      'Test Duration',

    'page-load':
      'Page Load',

    'api-latency':
      'API Latency',

    'backend-latency':
      'Backend Latency',

    'timeout-resilience':
      'Timeout Resilience',

    regression:
      'Regression',
  };


  const SECURITY_ORDER = [
    'authentication',
    'authorization',
    'content-security-policy',
    'security-headers',
    'session-cookies',
    'data-exposure',
    'transport',
    'dependency-security',
  ];


  const PERFORMANCE_ORDER = [
    'test-duration',
    'page-load',
    'api-latency',
    'backend-latency',
    'timeout-resilience',
    'regression',
  ];


  function safeStatus(value) {
    const normalized =
      String(
        value ??
        'not-verified'
      ).toLowerCase();

    return (
      Object.prototype.hasOwnProperty.call(
        STATUS_LABELS,
        normalized
      )
        ? normalized
        : 'not-verified'
    );
  }


  function numericText(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '—';
  }


  function msText(value) {
    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return '—';
    }

    if (number >= 1000) {
      return (
        `${(number / 1000).toFixed(2)} s`
      );
    }

    return (
      `${Math.round(number)} ms`
    );
  }


  function listText(
    values,
    fallback = 'None recorded'
  ) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return fallback;
    }

    return values
      .map(
        value =>
          String(value)
      )
      .join(' · ');
  }


  function emptySecurityAreas() {
    if (!securityContainer) {
      return;
    }

    securityContainer.innerHTML =
      SECURITY_ORDER
        .map(
          area => `
            <article
              class="sp-area-card"
              data-status="not-verified"
            >
              <div class="sp-area-header">
                <strong>
                  ${escapeHtml(
                    SECURITY_LABELS[area]
                  )}
                </strong>

                <span>
                  NOT GENERATED
                </span>
              </div>

              <p>
                Awaiting a fresh QA run.
              </p>
            </article>
          `
        )
        .join('');
  }


  function emptyPerformanceAreas() {
    if (!performanceContainer) {
      return;
    }

    performanceContainer.innerHTML =
      PERFORMANCE_ORDER
        .map(
          area => `
            <article
              class="sp-area-card"
              data-status="not-verified"
            >
              <div class="sp-area-header">
                <strong>
                  ${escapeHtml(
                    PERFORMANCE_LABELS[area]
                  )}
                </strong>

                <span>
                  NOT GENERATED
                </span>
              </div>

              <p>
                Awaiting a fresh QA run.
              </p>
            </article>
          `
        )
        .join('');
  }


  if (
    !assessment ||
    typeof assessment !== 'object'
  ) {
    panel.dataset.status =
      'not-verified';

    setText(
      'sp-status',
      'AWAITING FRESH QA RUN'
    );

    setText(
      'sp-overall-status',
      '—'
    );

    setText(
      'sp-security-status',
      '—'
    );

    setText(
      'sp-performance-status',
      '—'
    );

    setText(
      'sp-security-blockers',
      '—'
    );

    setText(
      'sp-performance-blockers',
      '—'
    );

    setText(
      'sp-security-gaps',
      '—'
    );

    setText(
      'sp-performance-gaps',
      '—'
    );

    setText(
      'sp-source-coverage',
      'No Security/Performance assessment in this run'
    );

    setText(
      'sp-threshold-status',
      '—'
    );

    setText(
      'sp-average',
      '—'
    );

    setText(
      'sp-median',
      '—'
    );

    setText(
      'sp-p95',
      '—'
    );

    setText(
      'sp-wall-clock',
      '—'
    );

    emptySecurityAreas();
    emptyPerformanceAreas();

    return;
  }


  const overallStatus =
    safeStatus(
      assessment.status
    );


  const security =
    assessment.security ??
    {};

  const performance =
    assessment.performance ??
    {};


  const securityStatus =
    safeStatus(
      security.status
    );

  const performanceStatus =
    safeStatus(
      performance.status
    );


  panel.dataset.status =
    overallStatus;


  setText(
    'sp-status',
    STATUS_LABELS[
      overallStatus
    ]
  );


  setText(
    'sp-overall-status',
    STATUS_LABELS[
      overallStatus
    ]
  );


  setText(
    'sp-security-status',
    STATUS_LABELS[
      securityStatus
    ]
  );


  setText(
    'sp-performance-status',
    STATUS_LABELS[
      performanceStatus
    ]
  );


  setText(
    'sp-security-blockers',
    numericText(
      release
        .blockingSecurityAreas
    )
  );


  setText(
    'sp-performance-blockers',
    numericText(
      release
        .blockingPerformanceAreas
    )
  );


  setText(
    'sp-security-gaps',
    numericText(
      release.securityGaps
    )
  );


  setText(
    'sp-performance-gaps',
    numericText(
      release.performanceGaps
    )
  );


  setText(
    'sp-source-coverage',
    listText(
      assessment.sourceCoverage,
      'No verified sources'
    )
  );


  setText(
    'sp-threshold-status',
    performance
      .thresholdsConfigured
        ? 'CONFIGURED'
        : 'NOT CONFIGURED'
  );


  const observed =
    performance.observed ??
    {};


  setText(
    'sp-average',
    msText(
      observed.averageDuration
    )
  );


  setText(
    'sp-median',
    msText(
      observed.medianDuration
    )
  );


  setText(
    'sp-p95',
    msText(
      observed.p95Duration
    )
  );


  setText(
    'sp-wall-clock',
    msText(
      observed.wallClockDuration
    )
  );


  if (securityContainer) {
    const areas =
      Array.isArray(
        security.areas
      )
        ? security.areas
        : [];


    const requiredChecks =
      Array.isArray(
        security.requiredChecks
      ) &&
      security.requiredChecks.length > 0
        ? security.requiredChecks
        : SECURITY_ORDER;


    const extraIds =
      areas
        .map(
          item =>
            item?.area
        )
        .filter(
          areaId =>
            Boolean(areaId) &&
            !requiredChecks.includes(
              areaId
            )
        );


    const areaIds =
      [
        ...new Set(
          [
            ...requiredChecks,
            ...extraIds,
          ]
        ),
      ]
        .slice()
        .sort(
          (left, right) => {
            const leftIndex =
              SECURITY_ORDER.indexOf(
                left
              );
            const rightIndex =
              SECURITY_ORDER.indexOf(
                right
              );

            return (
              (
                leftIndex < 0
                  ? 999
                  : leftIndex
              ) -
              (
                rightIndex < 0
                  ? 999
                  : rightIndex
              )
            );
          }
        );


    securityContainer.innerHTML =
      areaIds
        .map(
          areaId => {

            const area =
              areas.find(
                item =>
                  item?.area ===
                  areaId
              );

            const areaLabel =
              SECURITY_LABELS[areaId] ||
              areaId;


            if (
              !area ||
              safeStatus(area.status) ===
                'not-verified'
            ) {
              return `
                <article
                  class="sp-area-card"
                  data-status="not-verified"
                >
                  <div class="sp-area-header">

                    <strong>
                      ${escapeHtml(
                        areaLabel
                      )}
                    </strong>

                    <span>
                      NOT MEASURED
                    </span>

                  </div>

                  <p>
                    ${escapeHtml(notMeasuredCopy())}
                  </p>
                </article>
              `;
            }


            const status =
              safeStatus(
                area.status
              );


            const severityText = [
              `C ${Number(
                area.critical ?? 0
              )}`,

              `H ${Number(
                area.high ?? 0
              )}`,

              `M ${Number(
                area.medium ?? 0
              )}`,

              `L ${Number(
                area.low ?? 0
              )}`,
            ].join(' · ');


            return `
              <article
                class="sp-area-card"
                data-status="${escapeHtml(
                  status
                )}"
              >

                <div class="sp-area-header">

                  <strong>
                    ${escapeHtml(
                      areaLabel
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      STATUS_LABELS[
                        status
                      ]
                    )}
                  </span>

                </div>


                <div class="sp-area-meta">

                  <span>
                    Evidence
                    <strong>
                      ${Number(
                        area.evidenceCount ??
                        0
                      )}
                    </strong>
                  </span>

                  <span>
                    Issues
                    <strong>
                      ${Number(
                        area.issueCount ??
                        0
                      )}
                    </strong>
                  </span>

                </div>


                <p>
                  ${escapeHtml(
                    Array.isArray(area.notes) &&
                    area.notes.length > 0
                      ? area.notes.join(' ')
                      : severityText
                  )}
                </p>


                <p>
                  Sources:
                  ${escapeHtml(
                    listText(
                      area.evidenceSources,
                      'None'
                    )
                  )}
                </p>

              </article>
            `;
          }
        )
        .join('');
  }


  if (performanceContainer) {
    const areas =
      Array.isArray(
        performance.areas
      )
        ? performance.areas
        : [];


    performanceContainer.innerHTML =
      PERFORMANCE_ORDER
        .map(
          areaId => {

            const area =
              areas.find(
                item =>
                  item?.area ===
                  areaId
              );


            if (
              !area ||
              safeStatus(area.status) ===
                'not-verified'
            ) {
              return `
                <article
                  class="sp-area-card"
                  data-status="not-verified"
                >
                  <div class="sp-area-header">

                    <strong>
                      ${escapeHtml(
                        PERFORMANCE_LABELS[
                          areaId
                        ]
                      )}
                    </strong>

                    <span>
                      NOT MEASURED
                    </span>

                  </div>

                  <p>
                    ${escapeHtml(notMeasuredCopy())}
                  </p>
                </article>
              `;
            }


            const status =
              safeStatus(
                area.status
              );


            const observedValue =
              msText(
                area.observedValueMs
              );


            const threshold =
              msText(
                area.thresholdMs
              );


            return `
              <article
                class="sp-area-card"
                data-status="${escapeHtml(
                  status
                )}"
              >

                <div class="sp-area-header">

                  <strong>
                    ${escapeHtml(
                      PERFORMANCE_LABELS[
                        areaId
                      ]
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      STATUS_LABELS[
                        status
                      ]
                    )}
                  </span>

                </div>


                <div class="sp-area-meta">

                  <span>
                    Evidence
                    <strong>
                      ${Number(
                        area.evidenceCount ??
                        0
                      )}
                    </strong>
                  </span>

                  <span>
                    Issues
                    <strong>
                      ${Number(
                        area.issueCount ??
                        0
                      )}
                    </strong>
                  </span>

                </div>


                <p>
                  Observed:
                  ${escapeHtml(
                    observedValue
                  )}
                </p>


                <p>
                  Threshold:
                  ${escapeHtml(
                    area.thresholdConfigured
                      ? threshold
                      : 'Not configured'
                  )}
                </p>


                <p>
                  Sources:
                  ${escapeHtml(
                    listText(
                      area.evidenceSources,
                      'None'
                    )
                  )}
                </p>


                <p>
                  ${escapeHtml(
                    Array.isArray(area.notes) &&
                    area.notes.length > 0
                      ? area.notes.join(' ')
                      : ''
                  )}
                </p>

              </article>
            `;
          }
        )
        .join('');
  }
}



function renderCompatibility(run) {
  const panel =
    byId('compatibility-panel');

  if (!panel) {
    return;
  }


  const assessment =
    run?.compatibilityAssessment;

  const release =
    run?.releaseAssessment ??
    {};


  const browserGrid =
    byId('compatibility-browser-grid');

  const profileGrid =
    byId('compatibility-profile-grid');

  const correlationList =
    byId('compatibility-correlations');


  const STATUS_LABELS = {
    healthy:
      'HEALTHY',

    degraded:
      'DEGRADED',

    poor:
      'POOR',

    critical:
      'CRITICAL',

    'not-verified':
      'NOT VERIFIED',

    'not-in-this-run':
      'NOT IN THIS RUN',
  };


  const PATTERN_LABELS = {
    'consistent-pass':
      'CONSISTENT PASS',

    'universal-failure':
      'UNIVERSAL FAILURE',

    'browser-specific':
      'BROWSER SPECIFIC',

    'profile-specific':
      'PROFILE SPECIFIC',

    'mobile-specific':
      'MOBILE SPECIFIC',

    'isolated-environment':
      'ISOLATED ENVIRONMENT',

    'mixed-regression':
      'MIXED REGRESSION',

    uncertain:
      'UNCERTAIN',

    'not-comparable':
      'NOT COMPARABLE',
  };


  function safeStatus(value) {
    const normalized =
      String(
        value ??
        'not-verified'
      ).toLowerCase();

    return (
      Object.prototype.hasOwnProperty.call(
        STATUS_LABELS,
        normalized
      )
        ? normalized
        : 'not-verified'
    );
  }


  function numericText(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '—';
  }


  function listText(
    values,
    fallback = 'None'
  ) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return fallback;
    }

    return values
      .map(
        value =>
          String(value)
      )
      .join(' · ');
  }


  function browserCardLabel(environment) {
    if (environment === 'Chromium') {
      return 'Chrome';
    }

    if (environment === 'WebKit') {
      return 'Safari';
    }

    return environment;
  }


  function environmentLabel(environment) {
    if (environment.kind === 'browser') {
      return browserCardLabel(
        environment.environment ??
        'Unknown'
      );
    }

    return environment.environment ?? 'Unknown';
  }


  function environmentCards(
    assessments,
    fallbackText
  ) {
    if (
      !Array.isArray(assessments) ||
      assessments.length === 0
    ) {
      return `
        <div class="compatibility-empty">
          ${escapeHtml(fallbackText)}
        </div>
      `;
    }


    return assessments
      .map(
        environment => {

          const status =
            safeStatus(
              environment.status
            );


          return `
            <article
              class="compatibility-env-card"
              data-status="${escapeHtml(
                status
              )}"
            >

              <div class="compatibility-env-header">

                <strong>
                  ${escapeHtml(
                    environmentLabel(
                      environment
                    )
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    STATUS_LABELS[
                      status
                    ]
                  )}
                </span>

              </div>


              <div class="compatibility-env-metrics">

                <span>
                  Tests
                  <strong>
                    ${Number(
                      environment.totalTests ??
                      0
                    )}
                  </strong>
                </span>

                <span>
                  Passed
                  <strong>
                    ${Number(
                      environment.passed ??
                      0
                    )}
                  </strong>
                </span>

                <span>
                  Regressions
                  <strong>
                    ${Number(
                      environment.compatibilityFailures ??
                      0
                    )}
                  </strong>
                </span>

                <span>
                  Uncertain
                  <strong>
                    ${Number(
                      environment.uncertainFailures ??
                      0
                    )}
                  </strong>
                </span>

              </div>


              <p>
                Issues:
                ${Number(
                  environment.issueCount ??
                  0
                )}
              </p>


              <p>
                ${escapeHtml(
                  status === 'not-in-this-run'
                    ? (
                        Array.isArray(environment.notes) &&
                        environment.notes.length > 0
                          ? environment.notes.join(' ')
                          : 'Not in this run. Run npm run qa:unattended to measure this browser and form factor.'
                      )
                    : (
                        Array.isArray(environment.notes) &&
                        environment.notes.length > 0
                          ? environment.notes.join(' ')
                          : `Sources: ${listText(
                              environment.evidenceSources,
                              'None'
                            )}`
                      )
                )}
              </p>

            </article>
          `;
        }
      )
      .join('');
  }


  if (
    !assessment ||
    typeof assessment !== 'object'
  ) {
    panel.dataset.status =
      'not-verified';

    setText(
      'compatibility-status',
      'AWAITING FRESH QA RUN'
    );

    setText(
      'compatibility-overall-status',
      '—'
    );

    setText(
      'compatibility-comparable',
      '—'
    );

    setText(
      'compatibility-regressions',
      '—'
    );

    setText(
      'compatibility-blockers',
      '—'
    );

    setText(
      'compatibility-gaps',
      '—'
    );

    setText(
      'compatibility-sources',
      'No Compatibility assessment in this run'
    );

    setText(
      'compatibility-missing-browsers',
      '—'
    );

    setText(
      'compatibility-missing-profiles',
      '—'
    );

    setText(
      'compatibility-missing-projects',
      '—'
    );


    if (browserGrid) {
      browserGrid.innerHTML = `
        <div class="compatibility-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }


    if (profileGrid) {
      profileGrid.innerHTML = `
        <div class="compatibility-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }


    if (correlationList) {
      correlationList.innerHTML = `
        <div class="compatibility-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }

    return;
  }


  const status =
    safeStatus(
      assessment.status
    );


  panel.dataset.status =
    status;


  setText(
    'compatibility-status',
    status === 'not-verified'
      ? 'NOT MEASURED THIS RUN'
      : STATUS_LABELS[status]
  );


  setText(
    'compatibility-overall-status',
    status === 'not-verified'
      ? 'NOT MEASURED'
      : STATUS_LABELS[status]
  );


  setText(
    'compatibility-comparable',
    numericText(
      assessment.comparableTests
    )
  );


  setText(
    'compatibility-regressions',
    numericText(
      assessment.regressions
    )
  );


  setText(
    'compatibility-blockers',
    numericText(
      release
        .blockingCompatibilityRegressions
    )
  );


  setText(
    'compatibility-gaps',
    numericText(
      release.compatibilityGaps
    )
  );


  setText(
    'compatibility-sources',
    listText(
      assessment.sourceCoverage,
      'No verified sources'
    )
  );


  setText(
    'compatibility-missing-browsers',
    listText(
      (assessment.missingBrowsers ?? []).map(
        browserCardLabel
      ),
      'None'
    )
  );


  setText(
    'compatibility-missing-profiles',
    listText(
      assessment.missingProfiles,
      'None'
    )
  );


  setText(
    'compatibility-missing-projects',
    listText(
      assessment.missingProjects,
      'None'
    )
  );


  if (browserGrid) {
    browserGrid.innerHTML =
      environmentCards(
        assessment.browserAssessments,
        'No browser compatibility data.'
      );
  }


  if (profileGrid) {
    profileGrid.innerHTML =
      environmentCards(
        assessment.profileAssessments,
        'No profile compatibility data.'
      );
  }


  if (!correlationList) {
    return;
  }


  const correlations =
    Array.isArray(
      assessment.correlations
    )
      ? assessment.correlations
      : [];


  const interesting =
    correlations.filter(
      correlation =>
        correlation.pattern !==
          'consistent-pass' &&
        correlation.pattern !==
          'not-comparable'
    );


  correlationList.innerHTML =
    interesting.length
      ? interesting
          .slice(0, 12)
          .map(
            correlation => {

              const status =
                safeStatus(
                  correlation.status
                );


              const pattern =
                PATTERN_LABELS[
                  correlation.pattern
                ] ??
                String(
                  correlation.pattern ??
                  'UNKNOWN'
                ).toUpperCase();


              return `
                <article
                  class="compatibility-correlation"
                  data-status="${escapeHtml(
                    status
                  )}"
                >

                  <div class="compatibility-correlation-header">

                    <div>
                      <strong>
                        ${escapeHtml(
                          correlation.title ??
                          'Unnamed test'
                        )}
                      </strong>

                      <small>
                        ${escapeHtml(
                          correlation.site ??
                          'Unknown site'
                        )}
                      </small>
                    </div>

                    <span>
                      ${escapeHtml(
                        pattern
                      )}
                    </span>

                  </div>


                  <div class="compatibility-correlation-grid">

                    <div>
                      <span>
                        Passing
                      </span>

                      <strong>
                        ${escapeHtml(
                          listText(
                            correlation
                              .passingEnvironments,
                            'None'
                          )
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Failing
                      </span>

                      <strong>
                        ${escapeHtml(
                          listText(
                            correlation
                              .failingEnvironments,
                            'None'
                          )
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Uncertain
                      </span>

                      <strong>
                        ${escapeHtml(
                          listText(
                            correlation
                              .uncertainEnvironments,
                            'None'
                          )
                        )}
                      </strong>
                    </div>

                  </div>

                </article>
              `;
            }
          )
          .join('')
      : `
          <div class="compatibility-empty">
            No environment-specific regressions
            are currently recorded.
          </div>
        `;
}



function renderApiBackend(run) {
  const panel =
    byId('api-backend-panel');

  if (!panel) {
    return;
  }


  const assessment =
    run?.apiBackendAssessment;

  const release =
    run?.releaseAssessment ??
    {};

  const apiIssues =
    Array.isArray(
      run?.apiIssues
    )
      ? run.apiIssues
      : [];

  const backendIssues =
    Array.isArray(
      run?.backendIssues
    )
      ? run.backendIssues
      : [];


  const apiContainer =
    byId('api-intelligence-issues');

  const backendContainer =
    byId('backend-intelligence-issues');


  const STATUS_LABELS = {
    healthy:
      'HEALTHY',

    degraded:
      'DEGRADED',

    poor:
      'POOR',

    critical:
      'CRITICAL',

    'not-verified':
      'NOT VERIFIED',
  };


  function safeStatus(value) {
    const normalized =
      String(
        value ??
        'not-verified'
      ).toLowerCase();

    return (
      Object.prototype.hasOwnProperty.call(
        STATUS_LABELS,
        normalized
      )
        ? normalized
        : 'not-verified'
    );
  }


  function numericText(value) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return '—';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '—';
  }


  function listText(
    values,
    fallback = 'None'
  ) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return fallback;
    }

    return values
      .map(
        value =>
          String(value)
      )
      .join(' · ');
  }


  function issueCards(
    issues,
    kind
  ) {
    if (
      !Array.isArray(issues) ||
      issues.length === 0
    ) {
      return `
        <div class="api-backend-empty">
          No ${escapeHtml(kind)} findings
          are recorded in this run.
        </div>
      `;
    }


    return issues
      .slice(0, 10)
      .map(
        issue => {

          const source =
            issue.source ??
            kind.toLowerCase();

          const severity =
            String(
              issue.severity ??
              'unknown'
            ).toUpperCase();

          const priority =
            issue.priority ??
            '—';

          const statusCode =
            issue.statusCode ??
            null;

          const target =
            kind === 'API'
              ? (
                  issue.endpoint ??
                  'Unresolved endpoint'
                )
              : (
                  issue.service ??
                  'Unresolved service'
                );

          const confidence =
            typeof issue.confidence ===
              'number'
              ? `${Math.round(
                  issue.confidence
                )}%`
              : '—';


          return `
            <article
              class="api-backend-issue"
              data-severity="${escapeHtml(
                String(
                  issue.severity ??
                  'unknown'
                ).toLowerCase()
              )}"
            >

              <div class="api-backend-issue-header">

                <div>

                  <strong>
                    ${escapeHtml(
                      issue.title ??
                      `${kind} finding`
                    )}
                  </strong>

                  <small>
                    ${escapeHtml(
                      target
                    )}
                  </small>

                </div>


                <div class="api-backend-badges">

                  <span>
                    ${escapeHtml(
                      priority
                    )}
                  </span>

                  <span>
                    ${escapeHtml(
                      severity
                    )}
                  </span>

                </div>

              </div>


              <div class="api-backend-issue-meta">

                <span>
                  Source
                  <strong>
                    ${escapeHtml(
                      source
                    )}
                  </strong>
                </span>


                <span>
                  HTTP
                  <strong>
                    ${escapeHtml(
                      statusCode === null
                        ? '—'
                        : String(
                            statusCode
                          )
                    )}
                  </strong>
                </span>


                <span>
                  Confidence
                  <strong>
                    ${escapeHtml(
                      confidence
                    )}
                  </strong>
                </span>


                <span>
                  Origin
                  <strong>
                    ${escapeHtml(
                      issue.originSource ??
                      '—'
                    )}
                  </strong>
                </span>

              </div>


              ${
                issue.rootCause
                  ? `
                    <p>
                      <strong>
                        Root cause:
                      </strong>
                      ${escapeHtml(
                        issue.rootCause
                      )}
                    </p>
                  `
                  : ''
              }


              ${
                issue.userImpact
                  ? `
                    <p>
                      <strong>
                        User impact:
                      </strong>
                      ${escapeHtml(
                        issue.userImpact
                      )}
                    </p>
                  `
                  : ''
              }

            </article>
          `;
        }
      )
      .join('');
  }


  if (
    !assessment ||
    typeof assessment !== 'object'
  ) {
    panel.dataset.status =
      'not-verified';


    setText(
      'api-backend-status',
      'AWAITING FRESH QA RUN'
    );

    setText(
      'api-backend-overall-status',
      '—'
    );

    setText(
      'api-backend-api-count',
      '—'
    );

    setText(
      'api-backend-backend-count',
      '—'
    );

    setText(
      'api-backend-api-blockers',
      '—'
    );

    setText(
      'api-backend-backend-blockers',
      '—'
    );

    setText(
      'api-backend-source-coverage',
      'No API/Backend assessment in this run'
    );

    setText(
      'api-backend-origin-sources',
      '—'
    );

    setText(
      'api-backend-api-gaps',
      '—'
    );

    setText(
      'api-backend-backend-gaps',
      '—'
    );


    setText(
      'api-intelligence-status',
      'NOT VERIFIED'
    );

    setText(
      'backend-intelligence-status',
      'NOT VERIFIED'
    );


    for (const id of [
      'api-endpoint-count',
      'api-unresolved-count',
      'api-server-errors',
      'api-auth-failures',
      'api-not-found',
      'api-timeouts',
      'backend-service-count',
      'backend-unresolved-count',
      'backend-server-errors',
      'backend-timeouts',
      'backend-dependencies',
      'backend-infrastructure',
    ]) {
      setText(
        id,
        '—'
      );
    }


    if (apiContainer) {
      apiContainer.innerHTML = `
        <div class="api-backend-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }


    if (backendContainer) {
      backendContainer.innerHTML = `
        <div class="api-backend-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }

    return;
  }


  const overallStatus =
    safeStatus(
      assessment.status
    );


  const api =
    assessment.api ??
    {};

  const backend =
    assessment.backend ??
    {};


  const apiStatus =
    safeStatus(
      api.status
    );


  const backendStatus =
    safeStatus(
      backend.status
    );


  panel.dataset.status =
    overallStatus;


  setText(
    'api-backend-status',
    STATUS_LABELS[
      overallStatus
    ]
  );


  setText(
    'api-backend-overall-status',
    STATUS_LABELS[
      overallStatus
    ]
  );


  setText(
    'api-backend-api-count',
    numericText(
      assessment.promotedApiIssues
    )
  );


  setText(
    'api-backend-backend-count',
    numericText(
      assessment.promotedBackendIssues
    )
  );


  setText(
    'api-backend-api-blockers',
    numericText(
      release.blockingApiIssues
    )
  );


  setText(
    'api-backend-backend-blockers',
    numericText(
      release.blockingBackendIssues
    )
  );


  setText(
    'api-backend-source-coverage',
    listText(
      assessment.sourceCoverage,
      'None'
    )
  );


  setText(
    'api-backend-origin-sources',
    listText(
      assessment.originSources,
      'None'
    )
  );


  setText(
    'api-backend-api-gaps',
    numericText(
      release.apiIntelligenceGaps
    )
  );


  setText(
    'api-backend-backend-gaps',
    numericText(
      release.backendIntelligenceGaps
    )
  );


  setText(
    'api-intelligence-status',
    STATUS_LABELS[
      apiStatus
    ]
  );


  setText(
    'backend-intelligence-status',
    STATUS_LABELS[
      backendStatus
    ]
  );


  setText(
    'api-endpoint-count',
    numericText(
      api.endpointCount
    )
  );


  setText(
    'api-unresolved-count',
    numericText(
      api.unresolvedEndpointCount
    )
  );


  setText(
    'api-server-errors',
    numericText(
      api.serverErrors
    )
  );


  setText(
    'api-auth-failures',
    numericText(
      api.authFailures
    )
  );


  setText(
    'api-not-found',
    numericText(
      api.notFoundResponses
    )
  );


  setText(
    'api-timeouts',
    numericText(
      api.timeouts
    )
  );


  setText(
    'backend-service-count',
    numericText(
      backend.serviceCount
    )
  );


  setText(
    'backend-unresolved-count',
    numericText(
      backend.unresolvedServiceCount
    )
  );


  setText(
    'backend-server-errors',
    numericText(
      backend.serverErrors
    )
  );


  setText(
    'backend-timeouts',
    numericText(
      backend.timeouts
    )
  );


  setText(
    'backend-dependencies',
    numericText(
      backend.dependencyFailures
    )
  );


  setText(
    'backend-infrastructure',
    numericText(
      backend.infrastructureFailures
    )
  );


  if (apiContainer) {
    apiContainer.innerHTML =
      issueCards(
        apiIssues,
        'API'
      );
  }


  if (backendContainer) {
    backendContainer.innerHTML =
      issueCards(
        backendIssues,
        'Backend'
      );
  }
}


function renderCrossLayer(run) {
  const panel =
    byId('cross-layer-panel');

  if (!panel) {
    return;
  }


  const assessment =
    run?.crossLayerAssessment;


  const incidentContainer =
    byId('cross-layer-incidents');

  const standaloneContainer =
    byId('cross-layer-standalone');


  const STATE_LABELS = {
    correlated:
      'CORRELATED',

    partial:
      'PARTIAL',

    'standalone-only':
      'STANDALONE ONLY',

    'no-evidence':
      'NO EVIDENCE',
  };


  function safeState(value) {
    const normalized =
      String(
        value ??
        'no-evidence'
      ).toLowerCase();

    return (
      Object.prototype.hasOwnProperty.call(
        STATE_LABELS,
        normalized
      )
        ? normalized
        : 'no-evidence'
    );
  }


  function numericText(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '—';
  }


  function listText(
    values,
    fallback = 'None'
  ) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return fallback;
    }

    return values
      .map(
        value =>
          String(value)
      )
      .join(' · ');
  }


  function percentage(
    part,
    total
  ) {
    const numerator =
      Number(part);

    const denominator =
      Number(total);

    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator <= 0
    ) {
      return '—';
    }

    return `${
      Math.round(
        (
          numerator /
          denominator
        ) * 100
      )
    }%`;
  }


  function evidenceChainHtml(
    chain
  ) {
    if (
      !Array.isArray(chain) ||
      chain.length === 0
    ) {
      return `
        <div class="cross-layer-chain-empty">
          No evidence chain recorded.
        </div>
      `;
    }


    return chain
      .map(
        (
          node,
          index
        ) => {

          const target =
            node.endpoint ??
            node.service ??
            node.site ??
            'Unknown target';


          return `
            <div class="cross-layer-node">

              <div class="cross-layer-node-index">
                ${index + 1}
              </div>


              <div class="cross-layer-node-body">

                <div class="cross-layer-node-heading">

                  <span class="cross-layer-source">
                    ${escapeHtml(
                      String(
                        node.source ??
                        'unknown'
                      ).toUpperCase()
                    )}
                  </span>


                  <strong>
                    ${escapeHtml(
                      node.title ??
                      'Unnamed evidence'
                    )}
                  </strong>

                </div>


                <small>
                  ${escapeHtml(
                    target
                  )}
                </small>


                ${
                  typeof node.statusCode ===
                    'number'
                    ? `
                      <span class="cross-layer-http">
                        HTTP ${Number(
                          node.statusCode
                        )}
                      </span>
                    `
                    : ''
                }

              </div>

            </div>
          `;
        }
      )
      .join('');
  }


  function incidentHtml(
    incident
  ) {
    const blocking =
      Boolean(
        incident.blocking
      );


    const confidence =
      typeof incident.confidence ===
        'number'
        ? `${Math.round(
            incident.confidence
          )}%`
        : '—';


    const correlationScore =
      typeof incident.correlationScore ===
        'number'
        ? `${Math.round(
            incident.correlationScore
          )}`
        : '—';


    return `
      <article
        class="cross-layer-incident"
        data-blocking="${
          blocking
            ? 'true'
            : 'false'
        }"
      >

        <div class="cross-layer-incident-header">

          <div>

            <span class="cross-layer-incident-id">
              ${escapeHtml(
                incident.id ??
                'incident:unknown'
              )}
            </span>

            <h4>
              ${escapeHtml(
                incident.title ??
                'Correlated incident'
              )}
            </h4>

          </div>


          <div class="cross-layer-badges">

            <span>
              ${escapeHtml(
                incident.priority ??
                '—'
              )}
            </span>

            <span>
              ${escapeHtml(
                String(
                  incident.severity ??
                  'unknown'
                ).toUpperCase()
              )}
            </span>

            ${
              blocking
                ? `
                  <span class="cross-layer-blocking-badge">
                    BLOCKING
                  </span>
                `
                : ''
            }

          </div>

        </div>


        <div class="cross-layer-incident-metrics">

          <div>
            <span>
              Sources
            </span>

            <strong>
              ${escapeHtml(
                listText(
                  incident.sources,
                  'None'
                )
              )}
            </strong>
          </div>


          <div>
            <span>
              Correlation
            </span>

            <strong>
              ${escapeHtml(
                correlationScore
              )}
            </strong>
          </div>


          <div>
            <span>
              Confidence
            </span>

            <strong>
              ${escapeHtml(
                confidence
              )}
            </strong>
          </div>


          <div>
            <span>
              Root layer
            </span>

            <strong>
              ${escapeHtml(
                incident.rootCauseLayer ??
                'unknown'
              )}
            </strong>
          </div>

        </div>


        <div class="cross-layer-reasons">

          <span>
            Correlation evidence
          </span>

          <strong>
            ${escapeHtml(
              listText(
                incident.reasons,
                'None'
              )
            )}
          </strong>

        </div>


        <div class="cross-layer-chain">
          ${evidenceChainHtml(
            incident.evidenceChain
          )}
        </div>


        ${
          incident.endpoints?.length
            ? `
              <p>
                <strong>
                  Endpoints:
                </strong>
                ${escapeHtml(
                  listText(
                    incident.endpoints
                  )
                )}
              </p>
            `
            : ''
        }


        ${
          incident.services?.length
            ? `
              <p>
                <strong>
                  Services:
                </strong>
                ${escapeHtml(
                  listText(
                    incident.services
                  )
                )}
              </p>
            `
            : ''
        }


        ${
          incident.rootCause
            ? `
              <p>
                <strong>
                  Root cause:
                </strong>
                ${escapeHtml(
                  incident.rootCause
                )}
              </p>
            `
            : ''
        }


        ${
          incident.userImpact
            ? `
              <p>
                <strong>
                  User impact:
                </strong>
                ${escapeHtml(
                  incident.userImpact
                )}
              </p>
            `
            : ''
        }


        ${
          incident.recommendation
            ? `
              <p>
                <strong>
                  Recommendation:
                </strong>
                ${escapeHtml(
                  incident.recommendation
                )}
              </p>
            `
            : ''
        }

      </article>
    `;
  }


  if (
    !assessment ||
    typeof assessment !== 'object'
  ) {
    panel.dataset.state =
      'no-evidence';


    setText(
      'cross-layer-state',
      'AWAITING FRESH QA RUN'
    );

    setText(
      'cross-layer-overall-state',
      '—'
    );

    setText(
      'cross-layer-issue-count',
      '—'
    );

    setText(
      'cross-layer-correlated-count',
      '—'
    );

    setText(
      'cross-layer-incident-count',
      '—'
    );

    setText(
      'cross-layer-blocking-count',
      '—'
    );

    setText(
      'cross-layer-source-coverage',
      'No Cross-layer assessment in this run'
    );

    setText(
      'cross-layer-standalone-count',
      '—'
    );

    setText(
      'cross-layer-correlation-rate',
      '—'
    );

    setText(
      'cross-layer-root-incidents',
      '—'
    );


    if (incidentContainer) {
      incidentContainer.innerHTML = `
        <div class="cross-layer-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }


    if (standaloneContainer) {
      standaloneContainer.innerHTML = `
        <div class="cross-layer-empty">
          Awaiting a fresh QA run.
        </div>
      `;
    }

    return;
  }


  const state =
    safeState(
      assessment.state
    );


  panel.dataset.state =
    state;


  setText(
    'cross-layer-state',
    STATE_LABELS[state]
  );


  setText(
    'cross-layer-overall-state',
    STATE_LABELS[state]
  );


  setText(
    'cross-layer-issue-count',
    numericText(
      assessment.issueCount
    )
  );


  setText(
    'cross-layer-correlated-count',
    numericText(
      assessment.correlatedIssueCount
    )
  );


  setText(
    'cross-layer-incident-count',
    numericText(
      assessment.incidentCount
    )
  );


  setText(
    'cross-layer-blocking-count',
    numericText(
      assessment.blockingIncidents
    )
  );


  setText(
    'cross-layer-source-coverage',
    listText(
      assessment.sourceCoverage,
      'None'
    )
  );


  setText(
    'cross-layer-standalone-count',
    numericText(
      assessment.standaloneIssueCount
    )
  );


  setText(
    'cross-layer-correlation-rate',
    percentage(
      assessment.correlatedIssueCount,
      assessment.issueCount
    )
  );


  setText(
    'cross-layer-root-incidents',
    numericText(
      assessment.incidentCount
    )
  );


  const incidents =
    Array.isArray(
      assessment.incidents
    )
      ? assessment.incidents
      : [];


  if (incidentContainer) {
    incidentContainer.innerHTML =
      incidents.length
        ? incidents
            .slice(0, 12)
            .map(
              incidentHtml
            )
            .join('')
        : `
            <div class="cross-layer-empty">
              No correlated cross-layer incidents
              are recorded in this run.
            </div>
          `;
  }


  const standalone =
    Array.isArray(
      assessment.standaloneIssueFingerprints
    )
      ? assessment.standaloneIssueFingerprints
      : [];


  if (standaloneContainer) {
    standaloneContainer.innerHTML =
      standalone.length
        ? `
            <div class="cross-layer-standalone-list">

              ${standalone
                .slice(0, 30)
                .map(
                  fingerprint =>
                    `
                      <span>
                        ${escapeHtml(
                          fingerprint
                        )}
                      </span>
                    `
                )
                .join('')}

            </div>
          `
        : `
            <div class="cross-layer-empty">
              No standalone issue evidence remains.
            </div>
          `;
  }
}



function renderUnifiedDecision(run) {
  const panel =
    byId('unified-decision-panel');

  if (!panel) {
    return;
  }


  const isUnifiedCanonical =
    run?.releaseDecisionSource ===
      'unified-v5' ||
    Number(
      run?.schemaVersion ??
      0
    ) >= 5;

  const legacy =
    run?.legacyReleaseAssessment ??
    (
      isUnifiedCanonical
        ? null
        : run?.releaseAssessment
    );

  const unified =
    run?.unifiedDecisionAssessment;

  const unitContainer =
    byId('unified-decision-unit-list');


  function textValue(
    value,
    fallback = '—'
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return fallback;
    }

    return String(value);
  }


  function numberValue(
    value
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return '—';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '—';
  }


  function percentValue(
    value
  ) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return '—';
    }

    return `${Math.round(value)}%`;
  }


  function scoreValue(
    value
  ) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return '—';
    }

    return String(
      Math.round(value)
    );
  }


  function listValue(
    values,
    fallback = 'None'
  ) {
    if (
      !Array.isArray(values) ||
      values.length === 0
    ) {
      return fallback;
    }

    return values
      .map(
        value =>
          String(value)
      )
      .join(' · ');
  }


  function normalizeState(
    value
  ) {
    return String(
      value ??
      'not-verified'
    )
      .trim()
      .toLowerCase();
  }


  function unitHtml(
    unit
  ) {
    const blocking =
      Boolean(
        unit.blocking
      );


    return `
      <article
        class="unified-decision-unit"
        data-blocking="${
          blocking
            ? 'true'
            : 'false'
        }"
      >

        <div class="unified-decision-unit-header">

          <div>

            <span>
              ${escapeHtml(
                String(
                  unit.kind ??
                  'decision-unit'
                ).toUpperCase()
              )}
            </span>

            <strong>
              ${escapeHtml(
                unit.id ??
                'Unknown decision unit'
              )}
            </strong>

          </div>


          <div class="unified-decision-unit-badges">

            <span>
              ${escapeHtml(
                "RAW " + (unit.priority ?? "—")
              )}
            </span>

            <span>
              ${escapeHtml(
                "RAW " + String(unit.severity ?? "unknown").toUpperCase()
              )}
            </span>

            ${
              blocking
                ? `
                  <span class="unified-decision-blocking">
                    DECISION BLOCK
                  </span>
                `
                : `
                  <span>
                    DECISION WARN
                  </span>
                `
            }

          </div>

        </div>


        <div class="unified-decision-unit-metrics">

          <div>
            <span>
              Priority score
            </span>

            <strong>
              ${escapeHtml(
                scoreValue(
                  unit.priorityScore
                )
              )}
            </strong>
          </div>


          <div>
            <span>
              Confidence
            </span>

            <strong>
              ${escapeHtml(
                percentValue(
                  unit.confidence
                )
              )}
            </strong>
          </div>


          <div>
            <span>
              Sources
            </span>

            <strong>
              ${escapeHtml(
                listValue(
                  unit.sources
                )
              )}
            </strong>
          </div>


          <div>
            <span>
              Evidence nodes
            </span>

            <strong>
              ${escapeHtml(
                numberValue(
                  Array.isArray(
                    unit.issueFingerprints
                  )
                    ? unit.issueFingerprints.length
                    : 0
                )
              )}
            </strong>
          </div>

        </div>


        ${
          unit.rootCauseLayer
            ? `
              <p>
                <strong>
                  Root layer:
                </strong>
                ${escapeHtml(
                  unit.rootCauseLayer
                )}
              </p>
            `
            : ''
        }


        ${
          unit.rootCause
            ? `
              <p>
                <strong>
                  Root cause:
                </strong>
                ${escapeHtml(
                  unit.rootCause
                )}
              </p>
            `
            : ''
        }


        ${
          unit.userImpact
            ? `
              <p>
                <strong>
                  User impact:
                </strong>
                ${escapeHtml(
                  unit.userImpact
                )}
              </p>
            `
            : ''
        }

      </article>
    `;
  }


  if (
    !unified ||
    typeof unified !== 'object'
  ) {
    panel.dataset.state =
      'not-verified';


    setText(
      'unified-decision-mode',
      'SHADOW · AWAITING FRESH QA RUN'
    );


    const legacyStatus =
      legacy?.status
        ? String(
            legacy.status
          ).toUpperCase()
        : '—';


    setText(
      'legacy-release-status',
      legacyStatus
    );

    setText(
      'legacy-release-risk',
      legacy?.risk
        ? String(
            legacy.risk
          ).toUpperCase()
        : '—'
    );

    setText(
      'legacy-release-confidence',
      percentValue(
        legacy?.confidence
      )
    );

    setText(
      'legacy-blocking-issues',
      numberValue(
        legacy?.blockingIssues
      )
    );

    setText(
      'legacy-nonblocking-issues',
      numberValue(
        legacy?.nonBlockingIssues
      )
    );


    for (const id of [
      'unified-decision-state',
      'unified-risk-score',
      'unified-quality-score',
      'unified-confidence',
      'unified-score-basis',
      'unified-raw-issues',
      'unified-decision-units',
      'unified-incident-units',
      'unified-standalone-units',
      'unified-correlation-savings',
      'unified-blocking-units',
      'unified-warning-units',
      'unified-highest-priority',
      'unified-highest-severity',
      'unified-correlated-evidence',
      'unified-blocking-gates',
      'unified-gap-dimensions',
    ]) {
      setText(
        id,
        '—'
      );
    }


    if (unitContainer) {
      unitContainer.innerHTML = `
        <div class="unified-decision-empty">
          Awaiting a fresh QA run with
          Unified Decision shadow data.
        </div>
      `;
    }

    return;
  }


  const state =
    normalizeState(
      unified.state
    );


  panel.dataset.state =
    state;


  setText(
    'unified-decision-mode',
    'SHADOW MODE'
  );


  setText(
    'legacy-release-status',
    legacy?.status
      ? String(
          legacy.status
        ).toUpperCase()
      : '—'
  );


  setText(
    'legacy-release-risk',
    legacy?.risk
      ? String(
          legacy.risk
        ).toUpperCase()
      : '—'
  );


  setText(
    'legacy-release-confidence',
    percentValue(
      legacy?.confidence
    )
  );


  setText(
    'legacy-blocking-issues',
    numberValue(
      legacy?.blockingIssues
    )
  );


  setText(
    'legacy-nonblocking-issues',
    numberValue(
      legacy?.nonBlockingIssues
    )
  );


  setText(
    'unified-decision-state',
    String(
      unified.state ??
      'not-verified'
    ).toUpperCase()
  );


  setText(
    'unified-risk-score',
    scoreValue(
      unified.riskScore
    )
  );


  setText(
    'unified-quality-score',
    scoreValue(
      unified.qualityScore
    )
  );


  setText(
    'unified-confidence',
    percentValue(
      unified.confidence
    )
  );


  setText(
    'unified-score-basis',
    textValue(
      unified.scoreBasis
    )
  );


  setText(
    'unified-raw-issues',
    numberValue(
      unified.rawIssueCount
    )
  );


  setText(
    'unified-decision-units',
    numberValue(
      unified.decisionUnitCount
    )
  );


  setText(
    'unified-incident-units',
    numberValue(
      unified.incidentUnits
    )
  );


  setText(
    'unified-standalone-units',
    numberValue(
      unified.standaloneUnits
    )
  );


  setText(
    'unified-correlation-savings',
    numberValue(
      unified.correlationSavings
    )
  );


  setText(
    'unified-blocking-units',
    numberValue(
      unified.blockingUnits
    )
  );


  setText(
    'unified-warning-units',
    numberValue(
      unified.warningUnits
    )
  );


  setText(
    'unified-highest-priority',
    textValue(
      unified.highestPriority
    )
  );


  setText(
    'unified-highest-severity',
    textValue(
      unified.highestSeverity
    )
  );


  setText(
    'unified-correlated-evidence',
    numberValue(
      unified.correlatedEvidenceCount
    )
  );


  setText(
    'unified-blocking-gates',
    listValue(
      unified.blockingGateDimensions,
      'None'
    )
  );


  setText(
    'unified-gap-dimensions',
    listValue(
      unified.verificationGapDimensions,
      'None'
    )
  );


  const units =
    Array.isArray(
      unified.decisionUnits
    )
      ? unified.decisionUnits
      : [];


  if (unitContainer) {
    unitContainer.innerHTML =
      units.length
        ? units
            .slice(0, 20)
            .map(
              unitHtml
            )
            .join('')
        : `
            <div class="unified-decision-empty">
              No decision units remain after
              correlation and deduplication.
            </div>
          `;
  }


  setText(
    'unified-decision-mode',
    isUnifiedCanonical
      ? 'CANONICAL · UNIFIED v5'
      : (
          unified
            ? 'SHADOW · LEGACY OFFICIAL'
            : 'SHADOW · AWAITING FRESH QA RUN'
        )
  );
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

    const discoveryCount =
      Array.isArray(run.discoveryIssues)
        ? run.discoveryIssues.length
        : 0;

    if (discoveryCount > 0) {
      parts.push(
        `${discoveryCount} discovery finding${
          discoveryCount === 1 ? '' : 's'
        } still need review.`
      );
    }

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

function issuePriority(issue) {
  const explicitPriority =
    String(
      issue.priority ?? ''
    ).toUpperCase();

  if (
    [
      'P0',
      'P1',
      'P2',
      'P3',
      'P4',
    ].includes(
      explicitPriority
    )
  ) {
    return explicitPriority;
  }

  const explicitlyBlocking =
    issue.blocking === true ||
    issue.releaseBlocking === true ||
    issue.isBlocking === true;

  if (explicitlyBlocking) {
    return 'P0';
  }

  switch (
    String(
      issue.severity ?? ''
    ).toLowerCase()
  ) {
    case 'critical':
      return 'P1';

    case 'high':
      return 'P2';

    case 'medium':
      return 'P3';

    case 'low':
    case 'info':
    default:
      return 'P4';
  }
}

function issuePriorityRank(issue) {
  const ranks = {
    P0: 5,
    P1: 4,
    P2: 3,
    P3: 2,
    P4: 1,
  };

  return ranks[issuePriority(issue)] ?? 0;
}

function issueNeedsHuman(issue) {
  const pack = currentRun?.humanReview;

  if (!pack || !Array.isArray(pack.needsHuman) || pack.needsHuman.length === 0) {
    return issue.classification === 'needs-investigation';
  }

  const ids = new Set(
    pack.needsHuman.map(item => item.id).filter(Boolean)
  );
  const titles = new Set(
    pack.needsHuman.map(item => item.title).filter(Boolean)
  );

  return (
    ids.has(issue.id) ||
    titles.has(issue.title) ||
    issue.classification === 'needs-investigation'
  );
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

  const priority =
    byId('priority-filter')?.value ??
    'all';

  const category =
    byId('category-filter')?.value ??
    'all';

  const browser =
    byId('browser-filter')?.value ??
    'all';

  const profile =
    byId('profile-filter')?.value ??
    'all';

  const source =
    byId('source-filter')?.value ??
    'all';

  const affectedBrowsers =
    Array.isArray(issue.affectedBrowsers)
      ? issue.affectedBrowsers
      : issue.browser
        ? [issue.browser]
        : [];

  const affectedProfiles =
    Array.isArray(issue.affectedProfiles)
      ? issue.affectedProfiles
      : issue.profile
        ? [issue.profile]
        : [];

  const searchableText = [
    issue.title,
    issue.fullTitle,
    issue.category,
    issue.site,
    issue.source,
    issue.classification,
    issue.severity,
    issue.classificationReason,
    issue.rootSymptom,
    issue.rootCause,
    issue.recommendation,
    issue.userImpact,
    issue.file,
    issue.errorMessage,
    issue.errorSnippet,
    issue.description,
    issue.evidence,
    issue.route,

    ...(Array.isArray(issue.affectedRoutes)
      ? issue.affectedRoutes
      : []),
    issue.error?.message,
    issue.project,
    issuePriority(issue),

    ...(Array.isArray(issue.affectedProjects)
      ? issue.affectedProjects
      : []),

    ...affectedBrowsers,
    ...affectedProfiles,

    ...(Array.isArray(issue.affectedSites)
      ? issue.affectedSites
      : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchesSearch =
    !search ||
    searchableText.includes(search);

  const matchesClassification =
    classification === 'all' ||
    (
      classification === 'needs-human'
        ? issueNeedsHuman(issue)
        : issue.classification === classification
    );

  const matchesSeverity =
    severity === 'all' ||
    issue.severity === severity;

  const matchesPriority =
    priority === 'all' ||
    issuePriority(issue) === priority;

  const matchesCategory =
    category === 'all' ||
    issue.category === category;

  const matchesBrowser =
    browser === 'all' ||
    affectedBrowsers.includes(browser);

  const matchesProfile =
    profile === 'all' ||
    affectedProfiles.includes(profile);

  const matchesSource =
    source === 'all' ||
    issue.source === source;

  return (
    matchesSearch &&
    matchesClassification &&
    matchesSeverity &&
    matchesPriority &&
    matchesCategory &&
    matchesBrowser &&
    matchesProfile &&
    matchesSource
  );
}

function renderIssues() {
  const visibleIssues =
    activeSiteFilter === 'all'
      ? currentIssues
      : currentIssues.filter(issue => {
          const affectedSites =
            Array.isArray(issue.affectedSites) &&
            issue.affectedSites.length
              ? issue.affectedSites
              : issue.site
                ? [issue.site]
                : [];

          return affectedSites.includes(
            activeSiteFilter
          );
        });

  const container = byId('issues-list');

  if (!container) return;

  const issues = visibleIssues
    .filter(issueMatchesFilters)
    .sort((first, second) => {
      const priorityDifference =
        issuePriorityRank(second) -
        issuePriorityRank(first);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const occurrenceDifference =
        (second.occurrences ?? 1) -
        (first.occurrences ?? 1);

      if (occurrenceDifference !== 0) {
        return occurrenceDifference;
      }

      return String(first.title ?? '').localeCompare(
        String(second.title ?? '')
      );
    });

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
        (
          issue.source === 'discovery'
            ? 'discovery-finding'
            : 'needs-investigation'
        );

        const occurrences =
        issue.occurrences ?? 1;

       const affectedBrowsers =
         Array.isArray(issue.affectedBrowsers) &&
         issue.affectedBrowsers.length
           ? issue.affectedBrowsers.join(', ')
           : issue.source === 'discovery'
             ? 'Discovery'
             : issue.project ?? 'Unknown';

      const affectedProfiles =
        Array.isArray(issue.affectedProfiles) &&
       issue.affectedProfiles.length
     ? issue.affectedProfiles.join(', ')
     : '';

      const affectedProjects =
        Array.isArray(issue.affectedProjects) &&
        issue.affectedProjects.length
      ? issue.affectedProjects
      : issue.project
      ? [issue.project]
      : [];

     const affectedRoutes =
       Array.isArray(issue.affectedRoutes) &&
       issue.affectedRoutes.length
         ? issue.affectedRoutes
         : issue.route
           ? [issue.route]
           : [];

     const technicalErrorMessage =
       issue.errorMessage ??
       issue.error?.message ??
       issue.evidence ??
       '';

      const issueContext =
        issue.classificationReason ??
        (
          issue.source === 'discovery'
            ? issue.description
            : ''
        );

      const contextLabel =
        issue.source === 'discovery'
          ? 'Discovery finding'
          : 'Assessment';

      const reason =
        issueContext
          ? `
              <div class="issue-context">
                <strong>
                  ${escapeHtml(contextLabel)}
                </strong>

                <p>
                  ${escapeHtml(issueContext)}
                </p>
              </div>
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

      const issueScope = [
        issue.source === 'discovery'
          ? (
              affectedRoutes.length
                ? `Affected routes: ${affectedRoutes.length}`
                : null
            )
          : (
              affectedProjects.length
                ? `Affected environments: ${affectedProjects.length}`
                : null
            ),

        affectedProfiles
          ? `Profiles: ${affectedProfiles}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const sourceLocation =
        issue.file
          ? `${issue.file}${
              issue.line
                ? `:${issue.line}`
                : ''
            }`
          : issue.route ?? '';

      const affectedEnvironmentList =
        issue.source === 'discovery'
          ? affectedRoutes.join(', ')
          : affectedProjects.join(', ');

      const scopeDetailLabel =
        issue.source === 'discovery'
          ? 'Affected routes'
          : 'Affected environments';

      const rootCause = issue.rootCause
        ? `
            <div class="root-cause">
              <strong>Likely root cause</strong>
              <p>${escapeHtml(issue.rootCause)}</p>
            </div>
          `
        : '';

       const technicalError = technicalErrorMessage
       ? `
      <details class="issue-error">
        <summary>Technical evidence</summary>
        <pre>${escapeHtml(
          technicalErrorMessage
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
                ${escapeHtml(issue.category)} &middot;
                ${occurrences} occurrence${
                  occurrences === 1 ? '' : 's'
                } &middot;
                ${escapeHtml(affectedBrowsers)}
              </p>
            </div>

            <div class="issue-badges">
              <span class="priority-badge">
                ${escapeHtml(
                  issuePriority(issue)
                )}
              </span>
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

          ${
            issueScope
              ? `
                  <p class="muted">
                    ${escapeHtml(issueScope)}
                  </p>
                `
              : ''
          }

          ${
            sourceLocation
              ? `
                  <p class="muted">
                    <strong>Source:</strong>
                    ${escapeHtml(sourceLocation)}
                  </p>
                `
              : ''
          }

          ${
            affectedEnvironmentList
              ? `
                  <details class="issue-error">
                    <summary>
                     ${escapeHtml(scopeDetailLabel)}
                   </summary>
                    <pre>${escapeHtml(
                      affectedEnvironmentList
                    )}</pre>
                  </details>
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
  const actionableIssues =
    Array.isArray(currentIssues)
      ? currentIssues
      : [];

  const counts = actionableIssues.reduce(
    (summary, issue) => {
      switch (issue.classification) {
        case 'product-bug':
          summary.productBugs += 1;
          break;

        case 'content-bug':
          summary.contentBugs += 1;
          break;

        case 'automation-issue':
          summary.automationIssues += 1;
          break;

        case 'accessibility-issue':
          summary.accessibilityIssues += 1;
          break;

        case 'performance-issue':
          summary.performanceIssues += 1;
          break;

        case 'security-issue':
          summary.securityIssues += 1;
          break;

        case 'needs-investigation':
        default:
          summary.needsInvestigation += 1;
          break;
      }

      return summary;
    },
    {
      productBugs: 0,
      contentBugs: 0,
      automationIssues: 0,
      accessibilityIssues: 0,
      performanceIssues: 0,
      securityIssues: 0,
      needsInvestigation: 0,
    }
  );

  const summary = [];

  if (counts.productBugs > 0) {
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

  if (counts.contentBugs > 0) {
    summary.push(
      `${counts.contentBugs} content issue${
        counts.contentBugs === 1 ? '' : 's'
      } should be corrected.`
    );
  }

  if (counts.automationIssues > 0) {
    summary.push(
      `${counts.automationIssues} Playwright automation issue${
        counts.automationIssues === 1 ? '' : 's'
      } should be updated.`
    );
  }

  if (counts.needsInvestigation > 0) {
    summary.push(
      `${counts.needsInvestigation} issue${
        counts.needsInvestigation === 1 ? '' : 's'
      } require${
        counts.needsInvestigation === 1 ? 's' : ''
      } further investigation.`
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

  setText(
    'summary-text',
    summary.join(' ')
  );
}


function updateIssueFilterOptions(
  selectId,
  values,
  allLabel
) {
  const select = byId(selectId);

  if (!select) {
    return;
  }

  const previousValue =
    select.value || 'all';

  const uniqueValues = [
    ...new Set(
      values
        .filter(Boolean)
        .map(value => String(value))
    ),
  ].sort((first, second) =>
    first.localeCompare(second)
  );

  select.replaceChildren();

  const allOption =
    document.createElement('option');

  allOption.value = 'all';
  allOption.textContent = allLabel;

  select.appendChild(allOption);

  for (const value of uniqueValues) {
    const option =
      document.createElement('option');

    option.value = value;
    option.textContent = value;

    select.appendChild(option);
  }

  const previousStillExists =
    [...select.options].some(
      option =>
        option.value === previousValue
    );

  select.value =
    previousStillExists
      ? previousValue
      : 'all';
}

function populateIssueFilters() {
  const issues =
    Array.isArray(currentIssues)
      ? currentIssues
      : [];

  const categories =
    issues.map(issue => issue.category);

  const sources =
    issues.map(issue => issue.source);

  const browsers =
    issues.flatMap(issue => {
      if (
        Array.isArray(issue.affectedBrowsers)
      ) {
        return issue.affectedBrowsers;
      }

      return issue.browser
        ? [issue.browser]
        : [];
    });

  const profiles =
    issues.flatMap(issue => {
      if (
        Array.isArray(issue.affectedProfiles)
      ) {
        return issue.affectedProfiles;
      }

      return issue.profile
        ? [issue.profile]
        : [];
    });

  updateIssueFilterOptions(
    'category-filter',
    categories,
    'All categories'
  );

  updateIssueFilterOptions(
    'browser-filter',
    browsers,
    'All browsers'
  );

  updateIssueFilterOptions(
    'profile-filter',
    profiles,
    'All profiles'
  );

  updateIssueFilterOptions(
    'source-filter',
    sources,
    'All sources'
  );
}

function bindFilters() {
  const controls = [
    byId('issue-search'),
    byId('classification-filter'),
    byId('severity-filter'),
    byId('priority-filter'),
    byId('category-filter'),
    byId('browser-filter'),
    byId('profile-filter'),
    byId('source-filter'),
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
function renderRootCauseNotes(run) {
  const container = byId('root-cause-notes');
  const status = byId('root-cause-status');
  const notes = Array.isArray(run?.rootCauseNotes)
    ? run.rootCauseNotes
    : Array.isArray(run?.humanReview?.rootCauseNotes)
      ? run.humanReview.rootCauseNotes
      : [];

  if (status) {
    const engine = notes.some(note => note.engine === 'openai')
      ? 'LLM ENRICHED'
      : 'HEURISTIC';
    status.textContent = notes.length
      ? `${notes.length} NOTES · ${engine}`
      : 'HEURISTIC';
  }

  if (!container) {
    return;
  }

  if (notes.length === 0) {
    container.innerHTML =
      'No failing-test root-cause notes for this run. Heuristic Sentinel AI still ran.';
    return;
  }

  container.innerHTML = notes
    .slice(0, 8)
    .map(note => `
      <article class="root-cause-note">
        <p class="eyebrow">${escapeHtml(note.theme)} · ${escapeHtml(note.engine)} · ${escapeHtml(note.site)}</p>
        <h3>${escapeHtml(note.title)}</h3>
        <p><strong>Root cause:</strong> ${escapeHtml(note.summary)}</p>
        <p>${escapeHtml(note.recommendation)}</p>
      </article>
    `)
    .join('');
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

  const sample = isSampleRun(run);

  setText(
    'control-center-status',
    sample
      ? 'SAMPLE DATA'
      : `${health}% HEALTH`
  );

  setText(
    'control-dashboard-status',
    sample
      ? 'SAMPLE DATA'
      : `${health}% HEALTH`
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
    'control-pdf-status',
    run?.executiveReport?.status === 'written'
      ? 'PDF READY'
      : run?.executiveReport?.status === 'error'
        ? 'PDF FAILED'
        : 'AFTER RUN'
  );

  setText(
    'control-human-status',
    String(run?.humanReview?.verdict ?? 'PACK')
  );

  setText(
    'control-remediation-status',
    run?.remediation
      ? `${run.remediation.itemCount ?? 0} LOCAL`
      : 'LOCAL'
  );

  setText(
    'control-release-status',
    String(run?.releaseUpdate?.verdict ?? run?.humanReview?.verdict ?? 'REVIEW')
  );

  setText(
    'control-markdown-status',
    `${totalTests} TESTS`
  );

  setText(
    'control-playwright-status',
    failed === 0
      ? (
          String(assessment.status ?? '') ===
            'ready'
            ? 'ALL PASSED'
            : 'TESTS PASSED'
        )
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

  setText(
    'control-settings-status',
    'ACTIVE · READ ONLY'
  );
}

function deriveSiteStatistics(run, siteId) {
  const existing = run?.siteStatistics?.[siteId];

  if (existing && Number(existing.total) > 0) {
    return existing;
  }

  const tests = (run?.tests ?? []).filter(
    test => test.site === siteId
  );

  if (tests.length === 0) {
    return existing ?? null;
  }

  const passed = tests.filter(test => test.status === 'passed').length;
  const failed = tests.filter(test => test.status === 'failed').length;
  const skipped = tests.filter(test => test.status === 'skipped').length;
  const timedOut = tests.filter(test => test.status === 'timedOut').length;
  const interrupted = tests.filter(test => test.status === 'interrupted').length;
  const warnings = tests.filter(test => test.classification === 'warning').length;
  const durationTotal = tests.reduce(
    (sum, test) => sum + (Number(test.duration) || 0),
    0
  );

  return {
    site: siteId,
    total: tests.length,
    passed,
    failed,
    skipped,
    timedOut,
    interrupted,
    warnings,
    averageDuration: Math.round(durationTotal / tests.length),
    health: Math.max(
      0,
      Math.min(
        100,
        Math.round((passed / tests.length) * 100)
      )
    ),
  };
}

function renderSiteStatistics(run) {
  const projectBySite = Object.fromEntries(
    (Array.isArray(run?.projects) ? run.projects : []).map(project => [
      project.site || project.id,
      project,
    ])
  );
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
    const derived = deriveSiteStatistics(run, siteId);
    const project = projectBySite[siteId];
    const stats = project
      ? {
          ...derived,
          ...project,
          health: project.passRate ?? project.health ?? derived?.health,
          passRate: project.passRate ?? derived?.passRate ?? derived?.health,
          warnings: derived?.warnings ?? 0,
          averageDuration: derived?.averageDuration ?? 0,
        }
      : derived;

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
          Number(stats.passRate ?? stats.health) || 0
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
  const [run, history, issues, unifiedIssues] =
  await Promise.all([
    loadJson('./data/latest-run.json', null),
    loadJson('./data/history.json', []),
    loadJson('./data/issues.json', []),
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

 currentIssues =
  unifiedIssues.length
    ? unifiedIssues
    : issues.length
      ? issues
      : run.prioritizedIssues ?? [];

  populateIssueFilters();

  renderDataSourceBanner(run);
  renderMetadata(run);
  renderReleaseAssessment(run);
  renderDiscoveryReleaseReadiness(run);
  renderMetrics(run);
  renderSentinelAi(run);
  renderRootCauseNotes(run);
  renderAutonomousQa(run);

  renderSiteStatistics(run);
  renderControlCenter(
  run,
  history
);
  renderUxUi(run);
  renderSecurityPerformance(run);
  renderCompatibility(run);
  renderApiBackend(run);
  renderCrossLayer(run);
  renderUnifiedDecision(run);
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

bindFilters();
bindSiteFilters();
refreshDashboard();
startAutoRefresh();
