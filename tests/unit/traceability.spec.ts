import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
  RequirementCoverage,
  RequirementDefinition,
} from '../../reporters/models/types';
import { loadRequirements } from '../../reporters/utils/requirements';
import {
  buildTraceabilityMatrix,
  writeTraceabilityReport,
} from '../../reporters/utils/traceability-report';

function coverage(
  requirementId: string,
  status: RequirementCoverage['status'],
  criteria: RequirementCoverage['criteria']
): RequirementCoverage {
  return {
    requirementId,
    title: requirementId,
    critical: false,
    status,
    reason: status === 'not-tested' ? 'No evidence' : 'Measured',
    evidenceCount: criteria.reduce((sum, item) => sum + item.evidenceCount, 0),
    passedEvidenceCount: status === 'pass' ? 1 : 0,
    failedEvidenceCount: status === 'fail' ? 1 : 0,
    coveredBySources: ['test'],
    issueFingerprints: [],
    criteria,
  };
}

test.describe('traceability matrix', () => {
  test('marks catalog requirements without evidence as gaps', () => {
    const requirements: RequirementDefinition[] = [
      {
        id: 'REQ-DEMO-001',
        title: 'Demo',
        site: 'nation',
        acceptanceCriteria: [
          { id: 'AC-DEMO-001', title: 'Loads' },
        ],
      },
    ];

    const matrix = buildTraceabilityMatrix(requirements, []);

    expect(matrix.gapCount).toBe(1);
    expect(matrix.coveredCount).toBe(0);
    expect(matrix.rows[0].kind).toBe('gap');
    expect(matrix.rows[0].criteria[0].kind).toBe('gap');
  });

  test('splits covered, partial and gap from latest-run coverage', () => {
    const requirements: RequirementDefinition[] = [
      {
        id: 'REQ-A',
        title: 'Covered',
        site: 'nation',
        acceptanceCriteria: [{ id: 'AC-A', title: 'A' }],
      },
      {
        id: 'REQ-B',
        title: 'Partial',
        site: 'nation',
        acceptanceCriteria: [
          { id: 'AC-B1', title: 'B1' },
          { id: 'AC-B2', title: 'B2' },
        ],
      },
      {
        id: 'REQ-C',
        title: 'Missing',
        site: 'ai-skills',
        acceptanceCriteria: [{ id: 'AC-C', title: 'C' }],
      },
    ];

    const matrix = buildTraceabilityMatrix(requirements, [
      coverage('REQ-A', 'pass', [
        {
          criterionId: 'AC-A',
          title: 'A',
          critical: false,
          status: 'pass',
          evidenceCount: 1,
          passedEvidenceCount: 1,
          failedEvidenceCount: 0,
        },
      ]),
      coverage('REQ-B', 'partially-verified', [
        {
          criterionId: 'AC-B1',
          title: 'B1',
          critical: false,
          status: 'pass',
          evidenceCount: 1,
          passedEvidenceCount: 1,
          failedEvidenceCount: 0,
        },
        {
          criterionId: 'AC-B2',
          title: 'B2',
          critical: false,
          status: 'not-tested',
          evidenceCount: 0,
          passedEvidenceCount: 0,
          failedEvidenceCount: 0,
        },
      ]),
    ]);

    expect(matrix.coveredCount).toBe(1);
    expect(matrix.partialCount).toBe(1);
    expect(matrix.gapCount).toBe(1);
    expect(matrix.rows.find(row => row.requirementId === 'REQ-B')?.gapCount).toBe(
      1
    );
  });

  test('writes reports/traceability.html from the live catalog', () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'qa-traceability-')
    );

    const filePath = writeTraceabilityReport({
      requirements: loadRequirements().slice(0, 2),
      coverage: [],
      reportsDirectory: directory,
      generatedAt: '2026-08-18T00:00:00.000Z',
      runId: 'unit',
    });

    const html = fs.readFileSync(filePath, 'utf8');

    expect(filePath.endsWith('traceability.html')).toBe(true);
    expect(html).toMatch(/Requirements traceability/);
    expect(html).toMatch(/gap/);
    expect(html).toMatch(/REQ-/);
  });
});
