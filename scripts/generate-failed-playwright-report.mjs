import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();

const latestRunFile =
  path.join(root, 'dashboard', 'data', 'latest-run.json');

const unifiedIssuesFile =
  path.join(root, 'dashboard', 'data', 'unified-issues.json');

const reportsDir =
  path.join(root, 'reports');

const assetsDir =
  path.join(reportsDir, 'failed-playwright-assets');

const htmlFile =
  path.join(reportsDir, 'failed-playwright-report.html');

const pdfFile =
  path.join(reportsDir, 'failed-playwright-report.pdf');

const jsonFile =
  path.join(reportsDir, 'failed-playwright-report.json');

const failedStatuses =
  new Set(['failed', 'timedOut', 'interrupted']);

function readJson(file, fallback) {
  try {
    return JSON.parse(
      fs.readFileSync(file, 'utf8')
    );
  } catch {
    return fallback;
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uniq(values = []) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function resolveAttachmentPath(raw) {
  if (!raw) {
    return null;
  }

  const candidates = [
    raw,
    path.resolve(root, raw),
  ];

  const windows =
    String(raw).match(
      /^([A-Za-z]):[\\/](.*)$/
    );

  if (windows) {
    candidates.push(
      `/mnt/${windows[1].toLowerCase()}/${windows[2].replaceAll('\\', '/')}`
    );
  }

  const wsl =
    String(raw).match(
      /^\/mnt\/([a-z])\/(.*)$/i
    );

  if (wsl && process.platform === 'win32') {
    candidates.push(
      `${wsl[1].toUpperCase()}:\\${wsl[2].replaceAll('/', '\\')}`
    );
  }

  return candidates.find(
    candidate => {
      try {
        return fs.existsSync(candidate);
      } catch {
        return false;
      }
    }
  ) ?? null;
}

function firstScreenshot(tests) {
  for (const test of tests) {
    for (const attachment of test.attachments ?? []) {
      const isImage =
        attachment.kind === 'screenshot' ||
        String(
          attachment.contentType ?? ''
        ).startsWith('image/');

      if (!isImage) {
        continue;
      }

      const resolved =
        resolveAttachmentPath(
          attachment.path
        );

      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

const run =
  readJson(latestRunFile, null);

if (!run) {
  console.error(
    '[Failed Playwright Report] latest-run.json not found.'
  );
  process.exit(1);
}

const tests =
  Array.isArray(run.tests)
    ? run.tests
    : [];

const failedTests =
  tests.filter(test =>
    failedStatuses.has(test.status)
  );

/*
 * Failed Playwright Report semantics:
 *
 * One UNIQUE FAILURE = one logical Playwright test,
 * regardless of browser, project, profile or device.
 *
 * Example:
 *   same test failing in
 *   Chromium/Desktop,
 *   Firefox/Desktop,
 *   WebKit/Desktop,
 *   Tablet,
 *   Mobile
 *
 * remains ONE unique failure with multiple occurrences.
 */

const logicalFailures =
  new Map();

for (const test of failedTests) {
  const logicalKey = [
    test.site ?? '',
    test.file ?? '',
    test.line ?? '',
    test.title ??
      test.fullTitle ??
      '',
  ].join('|');

  const current =
    logicalFailures.get(
      logicalKey
    );

  if (current) {
    current.occurrences += 1;

    current.sourceTestIds.push(
      test.id
    );

    current.affectedProjects.push(
      test.project
    );

    current.affectedBrowsers.push(
      test.browserFamily
    );

    current.affectedProfiles.push(
      test.profile
    );

    current.affectedSites.push(
      test.site
    );

    continue;
  }

  logicalFailures.set(
    logicalKey,
    {
      source: 'test',

      fingerprint:
        logicalKey,

      title:
        test.title ??
        test.fullTitle ??
        'Unknown failure',

      file:
        test.file,

      line:
        test.line,

      site:
        test.site,

      severity:
        test.severity,

      category:
        test.category,

      occurrences: 1,

      sourceTestIds: [
        test.id,
      ],

      affectedProjects: [
        test.project,
      ],

      affectedBrowsers: [
        test.browserFamily,
      ],

      affectedProfiles: [
        test.profile,
      ],

      affectedSites: [
        test.site,
      ],

      rootCause:
        test.rootCause,

      recommendation:
        test.recommendation,

      rootSymptom:
        test.error?.message ??
        test.error?.stack ??
        '',
    }
  );
}

const uniqueIssues =
  [...logicalFailures.values()];

fs.mkdirSync(
  reportsDir,
  { recursive: true }
);

fs.rmSync(
  assetsDir,
  {
    recursive: true,
    force: true,
  }
);

fs.mkdirSync(
  assetsDir,
  { recursive: true }
);

const enriched =
  uniqueIssues.map(
    (issue, index) => {
      const sourceIds =
        issue.sourceTestIds ?? [];

      let matchingTests =
        failedTests.filter(test =>
          sourceIds.includes(test.id)
        );

      if (
        matchingTests.length === 0
      ) {
        matchingTests =
          failedTests.filter(test =>
            test.title === issue.title &&
            (
              !issue.file ||
              test.file === issue.file
            ) &&
            (
              !issue.line ||
              test.line === issue.line
            )
          );
      }

      const representative =
        matchingTests[0] ?? null;

      const projects =
        uniq([
          ...(issue.affectedProjects ?? []),
          ...matchingTests.map(
            test => test.project
          ),
        ]);

      const browsers =
        uniq([
          ...(issue.affectedBrowsers ?? []),
          ...matchingTests.map(
            test => test.browserFamily
          ),
        ]);

      const profiles =
        uniq([
          ...(issue.affectedProfiles ?? []),
          ...matchingTests.map(
            test => test.profile
          ),
        ]);

      const sites =
        uniq([
          ...(issue.affectedSites ?? []),
          issue.site,
          ...matchingTests.map(
            test => test.site
          ),
        ]);

      const screenshot =
        firstScreenshot(
          matchingTests
        );

      let screenshotRelative = null;

      if (screenshot) {
        const ext =
          path.extname(screenshot) ||
          '.png';

        const filename =
          `${String(index + 1).padStart(2, '0')}-${safeName(issue.title || 'failure')}${ext}`;

        const target =
          path.join(
            assetsDir,
            filename
          );

        try {
          fs.copyFileSync(
            screenshot,
            target
          );

          screenshotRelative =
            `failed-playwright-assets/${filename}`;
        } catch {
          screenshotRelative = null;
        }
      }

      const error =
        representative?.error?.message ??
        representative?.error?.stack ??
        issue.rootSymptom ??
        issue.rootCause ??
        'No Playwright error text was retained for this failure.';

      const source =
        issue.file
          ? `${issue.file}${issue.line ? `:${issue.line}` : ''}`
          : representative?.file
            ? `${representative.file}${representative.line ? `:${representative.line}` : ''}`
            : 'Unknown source';

      return {
        index: index + 1,
        title:
          issue.title ??
          representative?.title ??
          'Unknown failure',
        fullTitle:
          representative?.fullTitle ??
          issue.title ??
          '',
        occurrences:
          Number(
            issue.occurrences ??
            matchingTests.length ??
            1
          ),
        source,
        severity:
          issue.severity ??
          representative?.severity ??
          'unknown',
        category:
          issue.category ??
          representative?.category ??
          'unknown',
        sites,
        projects,
        browsers,
        profiles,
        error,
        rootCause:
          issue.rootCause ??
          representative?.rootCause ??
          '',
        recommendation:
          issue.recommendation ??
          representative?.recommendation ??
          '',
        screenshot:
          screenshotRelative,
        fingerprint:
          issue.fingerprint ?? '',
      };
    }
  );

enriched.sort(
  (a, b) =>
    b.occurrences -
    a.occurrences
);


/*
 * Final report-level deduplication.
 *
 * A Playwright test failing across several browsers/projects/device
 * profiles is ONE logical report issue with multiple executions.
 *
 * Raw Playwright evidence is preserved; only report presentation is
 * grouped here.
 */
const reportFailures = (() => {
  const groups = new Map();

  for (const item of enriched) {
    const identity = [
      String(item.source ?? '')
        .trim()
        .toLowerCase(),

      String(
        item.fullTitle ??
        item.title ??
        ''
      )
        .trim()
        .toLowerCase(),
    ].join('|');

    const current =
      groups.get(identity);

    if (!current) {
      groups.set(identity, {
        ...item,

        occurrences:
          Number(
            item.occurrences ?? 1
          ),

        projects:
          uniq([
            ...(item.projects ?? []),
          ]),

        browsers:
          uniq([
            ...(item.browsers ?? []),
          ]),

        profiles:
          uniq([
            ...(item.profiles ?? []),
          ]),

        sites:
          uniq([
            ...(item.sites ?? []),
          ]),
      });

      continue;
    }

    current.occurrences +=
      Number(
        item.occurrences ?? 1
      );

    current.projects =
      uniq([
        ...(current.projects ?? []),
        ...(item.projects ?? []),
      ]);

    current.browsers =
      uniq([
        ...(current.browsers ?? []),
        ...(item.browsers ?? []),
      ]);

    current.profiles =
      uniq([
        ...(current.profiles ?? []),
        ...(item.profiles ?? []),
      ]);

    current.sites =
      uniq([
        ...(current.sites ?? []),
        ...(item.sites ?? []),
      ]);

    if (
      !current.error &&
      item.error
    ) {
      current.error =
        item.error;
    }

    if (
      !current.rootCause &&
      item.rootCause
    ) {
      current.rootCause =
        item.rootCause;
    }

    if (
      !current.recommendation &&
      item.recommendation
    ) {
      current.recommendation =
        item.recommendation;
    }

    if (
      !current.screenshot &&
      item.screenshot
    ) {
      current.screenshot =
        item.screenshot;
    }
  }

  return Array
    .from(groups.values())
    .sort(
      (a, b) =>
        b.occurrences -
        a.occurrences
    )
    .map(
      (item, index) => ({
        ...item,
        index: index + 1,
      })
    );
})();

const totalExecutions =
  Number(
    run.totalTests ??
    tests.length ??
    0
  );

const failedExecutions =
  failedTests.length;

const uniqueFailures =
  reportFailures.length;

const repeatedOccurrences =
  Math.max(
    0,
    failedExecutions -
    uniqueFailures
  );

const summary = {
  generatedAt:
    new Date().toISOString(),
  runId:
    run.runId ?? null,
  totalExecutions,
  failedExecutions,
  uniqueFailures,
  repeatedOccurrences,
  failures: reportFailures,
};

fs.writeFileSync(
  jsonFile,
  JSON.stringify(
    summary,
    null,
    2
  ),
  'utf8'
);

const rows =
  reportFailures.length
    ? reportFailures.map(item => `
      <tr>
        <td>${item.index}</td>
        <td>${escapeHtml(item.title)}</td>
        <td class="number">${item.occurrences}</td>
        <td>${escapeHtml(item.source)}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="4" class="empty">
          No failed Playwright executions were recorded in the latest run.
        </td>
      </tr>
    `;

const details =
  reportFailures.map(item => `
    <section class="failure-detail">
      <div class="detail-kicker">
        QA SENTINEL TYRA • PLAYWRIGHT
      </div>

      <h2>
        ${item.index}. ${escapeHtml(item.title)}
      </h2>

      <div class="detail-grid">
        <div>
          <span>Test suite</span>
          <strong>${escapeHtml(item.fullTitle || '—')}</strong>
        </div>

        <div>
          <span>Source</span>
          <strong>${escapeHtml(item.source)}</strong>
        </div>

        <div>
          <span>Failed executions</span>
          <strong>${item.occurrences}</strong>
        </div>

        <div>
          <span>Severity / category</span>
          <strong>
            ${escapeHtml(item.severity)} / ${escapeHtml(item.category)}
          </strong>
        </div>
      </div>

      <h3>Affected projects</h3>
      <p>
        ${escapeHtml(item.projects.join(', ') || '—')}
      </p>

      <h3>Browsers</h3>
      <p>
        ${escapeHtml(item.browsers.join(', ') || '—')}
      </p>

      <h3>Profiles / devices</h3>
      <p>
        ${escapeHtml(item.profiles.join(', ') || '—')}
      </p>

      <h3>Playwright error</h3>
      <pre>${escapeHtml(item.error)}</pre>

      ${
        item.rootCause
          ? `
            <h3>Root cause</h3>
            <p>${escapeHtml(item.rootCause)}</p>
          `
          : ''
      }

      ${
        item.recommendation
          ? `
            <h3>Recommendation</h3>
            <p>${escapeHtml(item.recommendation)}</p>
          `
          : ''
      }

      ${
        item.screenshot
          ? `
            <h3>Failure screenshot</h3>
            <img
              class="failure-shot"
              src="${escapeHtml(item.screenshot)}"
              alt="Screenshot for ${escapeHtml(item.title)}"
            />
          `
          : `
            <p class="no-shot">
              No retained screenshot was available for this grouped failure.
            </p>
          `
      }

      <footer>
        QA Sentinel Tyra • Failed Playwright Checks
      </footer>
    </section>
  `).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA Sentinel Tyra - Failed Playwright Tests</title>
<style>
  :root {
    --navy:#183b67;
    --blue:#315f99;
    --pale:#e9f0f8;
    --line:#d6e0eb;
    --text:#152033;
    --muted:#6d7d91;
  }

  * {
    box-sizing:border-box;
  }

  body {
    margin:0;
    font-family:
      "Segoe UI",
      Arial,
      sans-serif;
    color:var(--text);
    background:#eef2f6;
  }

  .toolbar {
    position:sticky;
    top:0;
    z-index:10;
    display:flex;
    justify-content:flex-end;
    gap:10px;
    padding:12px 20px;
    background:#fff;
    border-bottom:1px solid var(--line);
  }

  .toolbar a,
  .toolbar button {
    border:1px solid #bfd0e2;
    border-radius:8px;
    background:#fff;
    padding:9px 14px;
    color:var(--navy);
    font-weight:700;
    text-decoration:none;
    cursor:pointer;
  }

  .page,
  .failure-detail {
    width:210mm;
    min-height:297mm;
    margin:18px auto;
    padding:16mm;
    background:#fff;
    box-shadow:0 4px 22px rgba(17,38,65,.08);
  }

  .brand {
    text-align:center;
    padding-top:3mm;
  }

  .brand small,
  .detail-kicker {
    color:#99a7ba;
    font-weight:700;
    font-size:11px;
    letter-spacing:.03em;
    text-transform:uppercase;
  }

  h1 {
    margin:7px 0 4px;
    color:var(--navy);
    font-size:29px;
    font-weight:500;
  }

  .subtitle {
    margin:0;
    color:var(--blue);
    font-size:22px;
    font-weight:600;
  }

  .rule {
    height:1px;
    margin:6px 0 20px;
    background:#4f7eb8;
  }

  .note {
    text-align:center;
    font-style:italic;
    margin-bottom:14px;
  }

  .metrics {
    display:grid;
    grid-template-columns:repeat(3,1fr);
    margin:0 0 10px;
  }

  .metric {
    text-align:center;
    background:var(--pale);
  }

  .metric span {
    display:block;
    padding:6px;
    background:var(--navy);
    color:white;
    font-size:12px;
    font-weight:700;
  }

  .metric strong {
    display:block;
    padding:10px;
    color:#245684;
    font-size:23px;
  }

  .explanation {
    margin:0 0 34px;
    font-size:13px;
  }

  h2 {
    color:var(--navy);
    font-size:19px;
  }

  h3 {
    margin:18px 0 5px;
    color:var(--navy);
    font-size:13px;
  }

  table {
    width:100%;
    border-collapse:collapse;
    font-size:12px;
  }

  th {
    text-align:left;
    padding:7px;
    background:#d7e4f1;
  }

  td {
    padding:9px 7px;
    vertical-align:top;
    border-bottom:1px solid #edf1f5;
  }

  td.number {
    width:110px;
    font-weight:700;
  }

  .empty {
    text-align:center;
    color:var(--muted);
    padding:28px;
  }

  .failure-detail {
    page-break-before:always;
  }

  .failure-detail h2 {
    margin-top:10px;
    font-size:22px;
  }

  .detail-grid {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
    margin:18px 0;
  }

  .detail-grid div {
    padding:10px;
    background:#f5f8fb;
    border:1px solid var(--line);
  }

  .detail-grid span {
    display:block;
    color:var(--muted);
    font-size:11px;
    text-transform:uppercase;
  }

  .detail-grid strong {
    display:block;
    margin-top:4px;
    font-size:12px;
  }

  pre {
    white-space:pre-wrap;
    word-break:break-word;
    padding:12px;
    border:1px solid var(--line);
    background:#f7f9fb;
    border-radius:6px;
    font-size:11px;
  }

  .failure-shot {
    max-width:100%;
    max-height:118mm;
    object-fit:contain;
    border:1px solid var(--line);
  }

  .no-shot {
    margin-top:22px;
    color:var(--muted);
    font-size:12px;
    font-style:italic;
  }

  footer {
    margin-top:20mm;
    text-align:center;
    color:#a1a9b3;
    font-size:10px;
  }

  @page {
    size:A4;
    margin:0;
  }

  @media print {
    body {
      background:#fff;
    }

    .toolbar {
      display:none;
    }

    .page,
    .failure-detail {
      margin:0;
      box-shadow:none;
    }
  }
</style>
</head>

<body>
  <div class="toolbar">
    <a href="/reports/failed-playwright-report.json" target="_blank">
      JSON evidence
    </a>
    <a href="/reports/failed-playwright-report.pdf" target="_blank">
      Open PDF
    </a>
    <button onclick="window.print()">
      Print
    </button>
  </div>

  <section class="page">
    <header class="brand">
      <small>QA SENTINEL TYRA • PLAYWRIGHT</small>
      <h1>QA Sentinel Tyra</h1>
      <p class="subtitle">Failed Playwright Tests</p>
    </header>

    <div class="rule"></div>

    <p class="note">
      Only failed executions from the latest Playwright run
    </p>

    <div class="metrics">
      <div class="metric">
        <span>Total executions</span>
        <strong>${totalExecutions}</strong>
      </div>

      <div class="metric">
        <span>Failed executions</span>
        <strong>${failedExecutions}</strong>
      </div>

      <div class="metric">
        <span>Unique failures</span>
        <strong>${uniqueFailures}</strong>
      </div>
    </div>

    <p class="explanation">
      ${failedExecutions} failed test executions are grouped below into
      ${uniqueFailures} unique failures.
      The same underlying failure reproduced across several browsers,
      projects or device profiles is shown only once, while its
      ${failedExecutions - uniqueFailures} repeated occurrences remain visible.
    </p>

    <h2>Failure overview</h2>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Test</th>
          <th>Affected executions</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <footer>
      QA Sentinel Tyra • Failed Playwright Checks
    </footer>
  </section>

  ${details}
</body>
</html>`;

fs.writeFileSync(
  htmlFile,
  html,
  'utf8'
);

console.log(
  `[Failed Playwright Report] HTML: ${htmlFile}`
);

console.log(
  `[Failed Playwright Report] Unique failures: ${uniqueFailures}`
);

console.log(
  `[Failed Playwright Report] Failed executions: ${failedExecutions}`
);

try {
  const {
    chromium,
  } = await import(
    '@playwright/test'
  );

  const browser =
    await chromium.launch({
      headless: true,
    });

  const page =
    await browser.newPage();

  await page.goto(
    pathToFileURL(htmlFile).href,
    {
      waitUntil: 'load',
    }
  );

  await page.pdf({
    path: pdfFile,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
  });

  await browser.close();

  console.log(
    `[Failed Playwright Report] PDF: ${pdfFile}`
  );
} catch (error) {
  console.warn(
    `[Failed Playwright Report] PDF generation skipped: ${error?.message ?? error}`
  );
}
