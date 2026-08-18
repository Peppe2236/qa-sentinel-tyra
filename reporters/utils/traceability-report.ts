import fs from 'node:fs';
import path from 'node:path';

import type {
  RequirementCoverage,
  RequirementDefinition,
  RequirementStatus,
} from '../models/types';

export type TraceabilityGapKind = 'covered' | 'gap' | 'partial';

export interface TraceabilityCriterionRow {
  criterionId: string;
  title: string;
  status: RequirementStatus;
  evidenceCount: number;
  kind: TraceabilityGapKind;
}

export interface TraceabilityRequirementRow {
  requirementId: string;
  title: string;
  site: string;
  critical: boolean;
  status: RequirementStatus;
  kind: TraceabilityGapKind;
  reason: string;
  evidenceCount: number;
  criteria: TraceabilityCriterionRow[];
  coveredCount: number;
  gapCount: number;
}

export interface TraceabilityMatrix {
  generatedAt: string;
  runId?: string;
  requirementCount: number;
  coveredCount: number;
  partialCount: number;
  gapCount: number;
  rows: TraceabilityRequirementRow[];
}

function escapeHtml(value?: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function kindFromStatus(status: RequirementStatus): TraceabilityGapKind {
  if (status === 'pass') {
    return 'covered';
  }

  if (status === 'partially-verified' || status === 'fail') {
    return 'partial';
  }

  return 'gap';
}

export function buildTraceabilityMatrix(
  requirements: RequirementDefinition[],
  coverage: RequirementCoverage[],
  meta?: {
    generatedAt?: string;
    runId?: string;
  }
): TraceabilityMatrix {
  const coverageById = new Map(
    coverage.map(item => [item.requirementId, item])
  );

  const rows: TraceabilityRequirementRow[] = requirements.map(requirement => {
    const matched = coverageById.get(requirement.id);
    const status: RequirementStatus = matched?.status ?? 'not-tested';
    const criteria: TraceabilityCriterionRow[] = (
      requirement.acceptanceCriteria ?? []
    ).map(criterion => {
      const covered = matched?.criteria.find(
        item => item.criterionId === criterion.id
      );
      const criterionStatus: RequirementStatus = covered?.status ?? 'not-tested';

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
      reason: matched?.reason ?? 'No latest-run evidence for this requirement.',
      evidenceCount: matched?.evidenceCount ?? 0,
      criteria,
      coveredCount: criteria.filter(item => item.kind === 'covered').length,
      gapCount: criteria.filter(item => item.kind === 'gap').length,
    };
  });

  return {
    generatedAt: meta?.generatedAt ?? new Date().toISOString(),
    runId: meta?.runId,
    requirementCount: rows.length,
    coveredCount: rows.filter(row => row.kind === 'covered').length,
    partialCount: rows.filter(row => row.kind === 'partial').length,
    gapCount: rows.filter(row => row.kind === 'gap').length,
    rows,
  };
}

export function renderTraceabilityHtml(matrix: TraceabilityMatrix): string {
  const rows = matrix.rows
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
    .join('');

  return `<!doctype html>
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
      ${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

export function writeTraceabilityReport(input: {
  requirements: RequirementDefinition[];
  coverage: RequirementCoverage[];
  reportsDirectory: string;
  generatedAt?: string;
  runId?: string;
}): string {
  const matrix = buildTraceabilityMatrix(
    input.requirements,
    input.coverage,
    {
      generatedAt: input.generatedAt,
      runId: input.runId,
    }
  );

  fs.mkdirSync(input.reportsDirectory, { recursive: true });

  const filePath = path.join(input.reportsDirectory, 'traceability.html');
  fs.writeFileSync(filePath, renderTraceabilityHtml(matrix), 'utf8');

  return filePath;
}
