import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function kindFromStatus(status) {
  if (status === 'pass') {
    return 'covered';
  }

  if (status === 'partially-verified' || status === 'fail') {
    return 'partial';
  }

  return 'gap';
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const requirementsFile = path.join(
  projectRoot,
  'requirements',
  'requirements.json'
);
const latestRunFile = path.join(
  projectRoot,
  'dashboard',
  'data',
  'latest-run.json'
);
const sampleRunFile = path.join(
  projectRoot,
  'dashboard',
  'data',
  'sample',
  'latest-run.sample.json'
);

const catalog = loadJson(requirementsFile, { requirements: [] });
const run =
  loadJson(latestRunFile, null) ??
  loadJson(sampleRunFile, { requirementCoverage: [] });

const coverage = Array.isArray(run?.requirementCoverage)
  ? run.requirementCoverage
  : [];
const coverageById = new Map(
  coverage.map(item => [item.requirementId, item])
);

const rows = (catalog.requirements ?? []).map(requirement => {
  const matched = coverageById.get(requirement.id);
  const status = matched?.status ?? 'not-tested';
  const criteria = (requirement.acceptanceCriteria ?? []).map(criterion => {
    const covered = matched?.criteria?.find(
      item => item.criterionId === criterion.id
    );
    const criterionStatus = covered?.status ?? 'not-tested';

    return {
      criterionId: criterion.id,
      title: criterion.title,
      status: criterionStatus,
      evidenceCount: covered?.evidenceCount ?? 0,
      kind: kindFromStatus(criterionStatus),
    };
  });

  return {
    requirementId: requirement.id,
    title: requirement.title,
    site: requirement.site ?? 'unknown',
    critical: Boolean(requirement.critical),
    status,
    kind: kindFromStatus(status),
    evidenceCount: matched?.evidenceCount ?? 0,
    criteria,
    coveredCount: criteria.filter(item => item.kind === 'covered').length,
  };
});

const matrix = {
  generatedAt: new Date().toISOString(),
  runId: run?.runId,
  requirementCount: rows.length,
  coveredCount: rows.filter(row => row.kind === 'covered').length,
  partialCount: rows.filter(row => row.kind === 'partial').length,
  gapCount: rows.filter(row => row.kind === 'gap').length,
  rows,
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QA Sentinel Tyra — requirements traceability</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: Segoe UI, sans-serif; margin: 2rem; background: #0f1419; color: #e8eef4; }
    h1 { font-size: 1.4rem; }
    .muted { color: #9aa8b5; }
    .pills { display: flex; gap: 0.75rem; flex-wrap: wrap; margin: 1rem 0 1.5rem; }
    .pill { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.8rem; }
    .pill.covered { background: #134e4a; color: #ccfbf1; }
    .pill.partial { background: #713f12; color: #fef3c7; }
    .pill.gap { background: #3f1d2b; color: #fecdd3; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.45rem 0.5rem; border-bottom: 1px solid #243040; vertical-align: top; }
    tr.requirement { background: #17202a; }
    tr.criterion { color: #c5d0da; }
    code { font-size: 0.82rem; }
  </style>
</head>
<body>
  <h1>Requirements traceability</h1>
  <p class="muted">
    Generated ${escapeHtml(matrix.generatedAt)}
    ${matrix.runId ? ` · run ${escapeHtml(matrix.runId)}` : ''}
    · catalog + latest-run evidence. Completing an assessment as a signed-in user is not claimed here.
  </p>
  <div class="pills">
    <span class="pill covered">${matrix.coveredCount} covered</span>
    <span class="pill partial">${matrix.partialCount} partial / failed</span>
    <span class="pill gap">${matrix.gapCount} gap</span>
    <span class="pill">${matrix.requirementCount} requirements</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Site</th>
        <th>Coverage</th>
        <th>Status</th>
        <th>Criteria</th>
        <th>Evidence</th>
      </tr>
    </thead>
    <tbody>
      ${matrix.rows
        .map(row => {
          const criteria = row.criteria
            .map(
              criterion => `
            <tr class="criterion ${criterion.kind}">
              <td></td>
              <td><code>${escapeHtml(criterion.criterionId)}</code></td>
              <td>${escapeHtml(criterion.title)}</td>
              <td>${escapeHtml(row.site)}</td>
              <td><span class="pill ${criterion.kind}">${escapeHtml(criterion.kind)}</span></td>
              <td>${escapeHtml(criterion.status)}</td>
              <td>${criterion.evidenceCount}</td>
            </tr>`
            )
            .join('');

          return `
        <tr class="requirement ${row.kind}">
          <td><code>${escapeHtml(row.requirementId)}</code></td>
          <td>${escapeHtml(row.title)}${row.critical ? ' <strong>critical</strong>' : ''}</td>
          <td>${escapeHtml(row.site)}</td>
          <td><span class="pill ${row.kind}">${escapeHtml(row.kind)}</span></td>
          <td>${escapeHtml(row.status)}</td>
          <td>${row.coveredCount}/${row.criteria.length}</td>
          <td>${row.evidenceCount}</td>
        </tr>
        ${criteria}`;
        })
        .join('')}
    </tbody>
  </table>
</body>
</html>
`;

const reportsDirectory = path.join(projectRoot, 'reports');
fs.mkdirSync(reportsDirectory, { recursive: true });
const outputPath = path.join(reportsDirectory, 'traceability.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`[QA Sentinel] Wrote ${path.relative(projectRoot, outputPath)}`);
console.log(
  fs.existsSync(latestRunFile)
    ? '[QA Sentinel] Used dashboard/data/latest-run.json evidence.'
    : '[QA Sentinel] latest-run.json missing; used sample or empty coverage (gaps).'
);
