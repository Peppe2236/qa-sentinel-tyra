import crypto from 'node:crypto';

import type {
  AutonomousQaActionCandidate,
  AutonomousQaAssessment,
  AutonomousQaChangeImpactCandidate,
  AutonomousQaChangeImpactScope,
  AutonomousQaEvidenceProvenance,
  AutonomousQaQualityDriftDirection,
  AutonomousQaQualityDriftSignal,
  AutonomousQaExecutionPhase,
  AutonomousQaExecutionPlanStep,
  AutonomousQaFailureEvidence,
  AutonomousQaFailureReproductionRecipe,
  AutonomousQaTestSelectionCandidate,
  AutonomousQaVerificationExpectation,
  AutonomousQaVerificationPlan,
  AutonomousQaTestSelectionReason,
  DashboardRun,
  DashboardTestResult,
  IntelligencePriority,
  IntelligenceSource,
  QualityDimension,
  ReleaseDecisionSource,
  UnifiedDecisionAssessment,
  UnifiedDecisionEvidenceState,
  UnifiedDecisionUnit,
  UnifiedDecisionDisposition,
} from '../models/types';

interface TestLinkableIssue {
  fingerprint: string;
  sourceTestIds?: string[];
}

const SOURCE_ORDER: IntelligenceSource[] = [
  'test',
  'discovery',
  'api',
  'backend',
];

const DIMENSION_ORDER: QualityDimension[] = [
  'requirements-functionality',
  'critical-flows',
  'ux-ui',
  'security-performance',
  'compatibility',
  'api-backend',
];

const PRIORITY_ORDER: IntelligencePriority[] = [
  'P0',
  'P1',
  'P2',
  'P3',
  'P4',
];

function orderedUnique<T>(
  values: T[],
  preferredOrder?: T[]
): T[] {
  const unique = new Set(values);

  if (!preferredOrder) {
    return [...unique];
  }

  return [
    ...preferredOrder.filter(
      value => unique.has(value)
    ),
    ...[...unique].filter(
      value => !preferredOrder.includes(value)
    ),
  ];
}

function buildProvenanceFromUnits(
  units: UnifiedDecisionUnit[]
): AutonomousQaEvidenceProvenance {
  return {
    intelligenceSources:
      orderedUnique(
        units.flatMap(
          unit => unit.sources
        ),
        SOURCE_ORDER
      ),

    qualityDimensions:
      orderedUnique(
        units.flatMap(
          unit => unit.qualityDimensions
        ),
        DIMENSION_ORDER
      ),

    unifiedDecisionUnitIds:
      orderedUnique(
        units.map(
          unit => unit.id
        )
      ),

    issueFingerprints:
      orderedUnique(
        units.flatMap(
          unit => unit.issueFingerprints
        )
      ),

    requirementIds:
      orderedUnique(
        units.flatMap(
          unit => unit.requirementIds
        )
      ),

    criticalFlowIds:
      orderedUnique(
        units.flatMap(
          unit => unit.criticalFlowIds
        )
      ),

    flowScenarioIds:
      orderedUnique(
        units.flatMap(
          unit => unit.flowScenarioIds
        )
      ),
  };
}

function buildProvenance(
  assessment:
    UnifiedDecisionAssessment | undefined
): AutonomousQaEvidenceProvenance {
  return buildProvenanceFromUnits(
    assessment?.decisionUnits ?? []
  );
}

function buildCandidateProvenance(
  units: UnifiedDecisionUnit[],
  tests: DashboardTestResult[],
  linkedFingerprints: string[]
): AutonomousQaEvidenceProvenance {
  const unitProvenance =
    buildProvenanceFromUnits(units);

  return {
    intelligenceSources:
      orderedUnique(
        [
          'test',
          ...unitProvenance.intelligenceSources,
        ],
        SOURCE_ORDER
      ),

    qualityDimensions:
      orderedUnique(
        [
          ...unitProvenance.qualityDimensions,
          ...tests.flatMap(
            test =>
              test.qualityDimensions ?? []
          ),
        ],
        DIMENSION_ORDER
      ),

    unifiedDecisionUnitIds:
      unitProvenance.unifiedDecisionUnitIds,

    issueFingerprints:
      orderedUnique(
        [
          ...unitProvenance.issueFingerprints,
          ...linkedFingerprints,
        ]
      ),

    requirementIds:
      orderedUnique(
        [
          ...unitProvenance.requirementIds,
          ...tests.flatMap(
            test =>
              test.requirementIds ?? []
          ),
        ]
      ),

    criticalFlowIds:
      orderedUnique(
        [
          ...unitProvenance.criticalFlowIds,
          ...tests.flatMap(
            test =>
              test.criticalFlowIds?.length
                ? test.criticalFlowIds
                : test.criticalFlow
                  ? [test.criticalFlow]
                  : []
          ),
        ]
      ),

    flowScenarioIds:
      orderedUnique(
        [
          ...unitProvenance.flowScenarioIds,
          ...tests.flatMap(
            test =>
              test.flowScenarioIds ?? []
          ),
        ]
      ),
  };
}

function logicalTestKey(
  test: DashboardTestResult
): string {
  return [
    test.site.trim().toLowerCase(),
    test.file
      .replace(/\\/g, '/')
      .trim()
      .toLowerCase(),
    test.title.trim().toLowerCase(),
  ].join('|');
}

function selectionId(
  logicalKey: string
): string {
  return (
    'test-selection-' +
    crypto
      .createHash('sha256')
      .update(logicalKey)
      .digest('hex')
      .slice(0, 12)
  );
}

function priorityRank(
  priority: IntelligencePriority
): number {
  return PRIORITY_ORDER.indexOf(priority);
}

function highestPriority(
  units: UnifiedDecisionUnit[]
): IntelligencePriority | null {
  const priorities =
    units.map(
      unit => unit.priority
    );

  if (priorities.length === 0) {
    return null;
  }

  return [...priorities].sort(
    (a, b) =>
      priorityRank(a) -
      priorityRank(b)
  )[0] ?? null;
}

function dispositionFor(
  units: UnifiedDecisionUnit[]
): UnifiedDecisionDisposition | null {
  if (
    units.some(
      unit => unit.disposition === 'block'
    )
  ) {
    return 'block';
  }

  if (units.length > 0) {
    return 'warn';
  }

  return null;
}

function evidenceStateFor(
  units: UnifiedDecisionUnit[]
): UnifiedDecisionEvidenceState | null {
  if (
    units.some(
      unit => unit.evidenceState === 'confirmed'
    )
  ) {
    return 'confirmed';
  }

  if (
    units.some(
      unit => unit.evidenceState === 'uncertain'
    )
  ) {
    return 'uncertain';
  }

  if (
    units.some(
      unit => unit.evidenceState === 'automation'
    )
  ) {
    return 'automation';
  }

  return null;
}

function confidenceFor(
  units: UnifiedDecisionUnit[]
): number | null {
  const values =
    units
      .map(
        unit => unit.confidence
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  return values.length > 0
    ? Math.max(...values)
    : null;
}

function isFailedCurrentRun(
  test: DashboardTestResult
): boolean {
  return test.status !== 'passed';
}

function selectionReasons(
  units: UnifiedDecisionUnit[],
  tests: DashboardTestResult[],
  provenance:
    AutonomousQaEvidenceProvenance
): AutonomousQaTestSelectionReason[] {
  const reasons:
    AutonomousQaTestSelectionReason[] = [];

  if (units.length > 0) {
    reasons.push(
      'unified-decision-link'
    );
  }

  if (
    tests.some(
      isFailedCurrentRun
    )
  ) {
    reasons.push(
      'failed-current-run'
    );
  }

  if (
    provenance.requirementIds.length > 0
  ) {
    reasons.push(
      'requirement-link'
    );
  }

  if (
    provenance.criticalFlowIds.length > 0
  ) {
    reasons.push(
      'critical-flow-link'
    );
  }

  if (
    provenance.flowScenarioIds.length > 0
  ) {
    reasons.push(
      'flow-scenario-link'
    );
  }

  return reasons;
}

function rationaleFor(
  candidate:
    AutonomousQaTestSelectionCandidate
): string {
  const parts: string[] = [];

  if (
    candidate.reasons.includes(
      'unified-decision-link'
    )
  ) {
    parts.push(
      'linked to existing Unified Decision evidence'
    );
  }

  if (
    candidate.reasons.includes(
      'failed-current-run'
    )
  ) {
    parts.push(
      'failed in the current QA run'
    );
  }

  if (
    candidate.reasons.includes(
      'requirement-link'
    )
  ) {
    parts.push(
      'carries explicit requirement coverage'
    );
  }

  if (
    candidate.reasons.includes(
      'critical-flow-link'
    )
  ) {
    parts.push(
      'carries explicit critical-flow coverage'
    );
  }

  if (
    candidate.reasons.includes(
      'flow-scenario-link'
    )
  ) {
    parts.push(
      'carries explicit flow-scenario coverage'
    );
  }

  const basis =
    parts.length > 0
      ? parts.join(', ')
      : 'has relevant current-run evidence';

  return (
    'Advisory test-selection candidate because it ' +
    basis +
    '. No autonomous execution is permitted.'
  );
}

function candidateActionsFor(
  candidates:
    AutonomousQaTestSelectionCandidate[]
): AutonomousQaActionCandidate[] {
  return candidates.map(
    candidate => ({
      id:
        `action-${candidate.id}`,

      kind:
        'test-selection',

      state:
        'candidate',

      title:
        (
          'Re-run ' +
          candidate.title +
          (
            candidate.variants.length > 1
              ? ` across ${candidate.variants.length} affected variants`
              : ''
          )
        ),

      rationale:
        rationaleFor(candidate),

      authority:
        'advisory-only',

      executable:
        false,

      confidence:
        candidate.confidence,

      provenance:
        candidate.provenance,

      testSelectionCandidateId:
        candidate.id,
    })
  );
}

function buildTestSelectionCandidates(
  assessment:
    UnifiedDecisionAssessment,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[]
): AutonomousQaTestSelectionCandidate[] {
  const unitByFingerprint =
    new Map<
      string,
      UnifiedDecisionUnit[]
    >();

  for (
    const unit of
    assessment.decisionUnits
  ) {
    for (
      const fingerprint of
      unit.issueFingerprints
    ) {
      const existing =
        unitByFingerprint.get(
          fingerprint
        ) ?? [];

      existing.push(unit);

      unitByFingerprint.set(
        fingerprint,
        existing
      );
    }
  }

  const fingerprintsByTestId =
    new Map<
      string,
      Set<string>
    >();

  for (
    const issue of
    unifiedIssues
  ) {
    if (
      !Array.isArray(
        issue.sourceTestIds
      )
    ) {
      continue;
    }

    for (
      const testId of
      issue.sourceTestIds
    ) {
      const existing =
        fingerprintsByTestId.get(
          testId
        ) ??
        new Set<string>();

      existing.add(
        issue.fingerprint
      );

      fingerprintsByTestId.set(
        testId,
        existing
      );
    }
  }

  const groups =
    new Map<
      string,
      DashboardTestResult[]
    >();

  for (
    const test of
    tests
  ) {
    const fingerprints =
      fingerprintsByTestId.get(
        test.id
      );

    const linkedToDecision =
      [...(
        fingerprints ?? []
      )].some(
        fingerprint =>
          unitByFingerprint.has(
            fingerprint
          )
      );

    if (
      !linkedToDecision &&
      !isFailedCurrentRun(test)
    ) {
      continue;
    }

    const key =
      logicalTestKey(test);

    const existing =
      groups.get(key) ?? [];

    existing.push(test);

    groups.set(
      key,
      existing
    );
  }

  const candidates:
    AutonomousQaTestSelectionCandidate[] =
      [];

  for (
    const [key, groupTests] of
    groups
  ) {
    const fingerprints =
      orderedUnique(
        groupTests.flatMap(
          test =>
            [
              ...(
                fingerprintsByTestId.get(
                  test.id
                ) ?? []
              ),
            ]
        )
      );

    const linkedUnits =
      orderedUnique(
        fingerprints.flatMap(
          fingerprint =>
            unitByFingerprint.get(
              fingerprint
            ) ?? []
        )
      );

    const provenance =
      buildCandidateProvenance(
        linkedUnits,
        groupTests,
        fingerprints
      );

    const first =
      [...groupTests].sort(
        (a, b) =>
          a.project.localeCompare(
            b.project
          ) ||
          a.id.localeCompare(b.id)
      )[0];

    if (!first) {
      continue;
    }

    const candidate:
      AutonomousQaTestSelectionCandidate =
        {
          id:
            selectionId(key),

          logicalTestKey:
            key,

          title:
            first.title,

          fullTitle:
            first.fullTitle,

          file:
            first.file,

          site:
            first.site,

          priority:
            highestPriority(
              linkedUnits
            ),

          disposition:
            dispositionFor(
              linkedUnits
            ),

          evidenceState:
            evidenceStateFor(
              linkedUnits
            ),

          riskEligible:
            linkedUnits.some(
              unit =>
                unit.riskEligible
            ),

          confidence:
            confidenceFor(
              linkedUnits
            ),

          reasons:
            selectionReasons(
              linkedUnits,
              groupTests,
              provenance
            ),

          variants:
            [...groupTests]
              .sort(
                (a, b) =>
                  a.project.localeCompare(
                    b.project
                  ) ||
                  a.id.localeCompare(
                    b.id
                  )
              )
              .map(
                test => ({
                  testId:
                    test.id,

                  project:
                    test.project,

                  browserFamily:
                    test.browserFamily,

                  profile:
                    test.profile,

                  status:
                    test.status,
                })
              ),

          provenance,
        };

    candidates.push(
      candidate
    );
  }

  return candidates.sort(
    (a, b) => {
      if (
        a.disposition !==
        b.disposition
      ) {
        if (
          a.disposition === 'block'
        ) {
          return -1;
        }

        if (
          b.disposition === 'block'
        ) {
          return 1;
        }
      }

      if (
        a.riskEligible !==
        b.riskEligible
      ) {
        return a.riskEligible
          ? -1
          : 1;
      }

      if (
        a.priority !==
        b.priority
      ) {
        if (a.priority === null) {
          return 1;
        }

        if (b.priority === null) {
          return -1;
        }

        const diff =
          priorityRank(
            a.priority
          ) -
          priorityRank(
            b.priority
          );

        if (diff !== 0) {
          return diff;
        }
      }

      return (
        a.site.localeCompare(
          b.site
        ) ||
        a.file.localeCompare(
          b.file
        ) ||
        a.title.localeCompare(
          b.title
        )
      );
    }
  );
}

export function analyzeAutonomousQaFoundation(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null
): AutonomousQaAssessment {
  const provenance =
    buildProvenance(
      unifiedDecisionAssessment
    );

  if (!unifiedDecisionAssessment) {
    return {
      authority:
        'advisory-only',

      capabilityStatus:
        'not-verified',

      executionEnabled:
        false,

      releaseDecisionSource,

      unifiedDecisionState:
        null,

      linkedDecisionUnitCount:
        0,

      provenance,

      candidateActions:
        [],

      testSelection: {
        status:
          'not-verified',

        candidateCount:
          0,

        selectedTestCount:
          0,

        candidates:
          [],
      },

      reason:
        'Unified Decision evidence is unavailable, so Autonomous QA remains not verified and cannot propose or execute actions.',
    };
  }

  return {
    authority:
      'advisory-only',

    capabilityStatus:
      'foundation-only',

    executionEnabled:
      false,

    releaseDecisionSource,

    unifiedDecisionState:
      unifiedDecisionAssessment.state,

    linkedDecisionUnitCount:
      unifiedDecisionAssessment
        .decisionUnits.length,

    provenance,

    candidateActions:
      [],

    reason:
      'Milestone 6.1 establishes advisory-only Autonomous QA contracts and provenance. Test selection, execution planning and autonomous execution are intentionally not enabled.',
  };
}

export function analyzeAutonomousQaTestSelection(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[]
): AutonomousQaAssessment {
  const foundation =
    analyzeAutonomousQaFoundation(
      unifiedDecisionAssessment,
      releaseDecisionSource
    );

  if (!unifiedDecisionAssessment) {
    return foundation;
  }

  const candidates =
    buildTestSelectionCandidates(
      unifiedDecisionAssessment,
      tests,
      unifiedIssues
    );

  const candidateActions =
    candidateActionsFor(
      candidates
    );

  return {
    ...foundation,

    capabilityStatus:
      'test-selection-advisory',

    candidateActions,

    testSelection: {
      status:
        candidates.length > 0
          ? 'available'
          : 'no-candidates',

      candidateCount:
        candidates.length,

      selectedTestCount:
        candidates.reduce(
          (
            total,
            candidate
          ) =>
            total +
            candidate.variants.length,
          0
        ),

      candidates,
    },

    reason:
      candidates.length > 0
        ? (
            'Milestone 6.2 selected advisory logical-test candidates from current-run failures and existing Unified Decision evidence. Existing Unified priority/disposition semantics are reused; no new weighted score is introduced and execution remains disabled.'
          )
        : (
            'Milestone 6.2 test-selection capability is available, but the current run produced no eligible failed or Unified-linked test candidates. Execution remains disabled.'
          ),
  };
}

const EXECUTION_PHASE_ORDER:
  AutonomousQaExecutionPhase[] = [
    'release-blocking',
    'risk-eligible',
    'uncertainty-verification',
    'evidence-follow-up',
  ];

function executionPhaseFor(
  candidate:
    AutonomousQaTestSelectionCandidate
): AutonomousQaExecutionPhase {
  if (
    candidate.disposition === 'block' &&
    candidate.riskEligible
  ) {
    return 'release-blocking';
  }

  if (candidate.riskEligible) {
    return 'risk-eligible';
  }

  if (
    candidate.evidenceState === 'automation' ||
    candidate.evidenceState === 'uncertain'
  ) {
    return 'uncertainty-verification';
  }

  return 'evidence-follow-up';
}

function executionPhaseRank(
  phase:
    AutonomousQaExecutionPhase
): number {
  return EXECUTION_PHASE_ORDER.indexOf(
    phase
  );
}

function executionPlanRationale(
  candidate:
    AutonomousQaTestSelectionCandidate,
  phase:
    AutonomousQaExecutionPhase
): string {
  switch (phase) {
    case 'release-blocking':
      return (
        'Plan first because existing Unified Decision evidence marks this logical test as blocking and risk-eligible. ' +
        'The plan reuses existing release semantics and does not introduce a new risk score.'
      );

    case 'risk-eligible':
      return (
        'Plan before non-risk-eligible evidence because existing Unified Decision evidence marks this logical test as risk-eligible. ' +
        'Existing priority and disposition are reused without additional weighting.'
      );

    case 'uncertainty-verification':
      return (
        'Plan as uncertainty verification because the evidence is automation-derived or uncertain and is not risk-eligible. ' +
        'The purpose is to resolve uncertainty, not to promote it into confirmed product risk.'
      );

    case 'evidence-follow-up':
      return (
        'Plan as evidence follow-up because the logical test remains relevant to the current run or Unified evidence but is not currently risk-eligible.'
      );
  }
}

function buildExecutionPlanSteps(
  candidates:
    AutonomousQaTestSelectionCandidate[]
): AutonomousQaExecutionPlanStep[] {
  const prepared =
    candidates.map(
      candidate => {
        const phase =
          executionPhaseFor(
            candidate
          );

        return {
          candidate,
          phase,
        };
      }
    );

  prepared.sort(
    (a, b) => {
      const phaseDiff =
        executionPhaseRank(
          a.phase
        ) -
        executionPhaseRank(
          b.phase
        );

      if (phaseDiff !== 0) {
        return phaseDiff;
      }

      if (
        a.candidate.priority !==
        b.candidate.priority
      ) {
        if (
          a.candidate.priority === null
        ) {
          return 1;
        }

        if (
          b.candidate.priority === null
        ) {
          return -1;
        }

        const priorityDiff =
          priorityRank(
            a.candidate.priority
          ) -
          priorityRank(
            b.candidate.priority
          );

        if (priorityDiff !== 0) {
          return priorityDiff;
        }
      }

      return (
        a.candidate.site.localeCompare(
          b.candidate.site
        ) ||
        a.candidate.file.localeCompare(
          b.candidate.file
        ) ||
        a.candidate.title.localeCompare(
          b.candidate.title
        )
      );
    }
  );

  return prepared.map(
    (
      {
        candidate,
        phase,
      },
      index
    ) => ({
      id:
        `execution-plan-${candidate.id}`,

      order:
        index + 1,

      phase,

      testSelectionCandidateId:
        candidate.id,

      title:
        candidate.title,

      file:
        candidate.file,

      site:
        candidate.site,

      projects:
        orderedUnique(
          candidate.variants.map(
            variant =>
              variant.project
          )
        ),

      testIds:
        orderedUnique(
          candidate.variants.map(
            variant =>
              variant.testId
          )
        ),

      priority:
        candidate.priority,

      disposition:
        candidate.disposition,

      evidenceState:
        candidate.evidenceState,

      riskEligible:
        candidate.riskEligible,

      executable:
        false,

      rationale:
        executionPlanRationale(
          candidate,
          phase
        ),

      provenance:
        candidate.provenance,
    })
  );
}

function executionPlanningActions(
  steps:
    AutonomousQaExecutionPlanStep[]
): AutonomousQaActionCandidate[] {
  return steps.map(
    step => ({
      id:
        `action-${step.id}`,

      kind:
        'execution-planning',

      state:
        'candidate',

      title:
        `Plan ${step.title}`,

      rationale:
        (
          step.rationale +
          ' Autonomous execution remains disabled.'
        ),

      authority:
        'advisory-only',

      executable:
        false,

      confidence:
        null,

      provenance:
        step.provenance,

      testSelectionCandidateId:
        step.testSelectionCandidateId,

      executionPlanStepId:
        step.id,
    })
  );
}

export function analyzeAutonomousQaExecutionPlanning(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[]
): AutonomousQaAssessment {
  const selectionAssessment =
    analyzeAutonomousQaTestSelection(
      unifiedDecisionAssessment,
      releaseDecisionSource,
      tests,
      unifiedIssues
    );

  const testSelection =
    selectionAssessment.testSelection;

  if (
    !unifiedDecisionAssessment ||
    !testSelection ||
    testSelection.status ===
      'not-verified'
  ) {
    return {
      ...selectionAssessment,

      executionPlan: {
        status:
          'not-verified',

        stepCount:
          0,

        plannedTestCount:
          0,

        phases:
          [],

        steps:
          [],
      },

      reason:
        'Risk-based execution planning is not verified because test-selection or Unified Decision evidence is unavailable. Autonomous execution remains disabled.',
    };
  }

  const steps =
    buildExecutionPlanSteps(
      testSelection.candidates
    );

  const phases =
    EXECUTION_PHASE_ORDER.filter(
      phase =>
        steps.some(
          step =>
            step.phase === phase
        )
    );

  const planningActions =
    executionPlanningActions(
      steps
    );

  return {
    ...selectionAssessment,

    capabilityStatus:
      'execution-planning-advisory',

    executionEnabled:
      false,

    candidateActions: [
      ...selectionAssessment.candidateActions,
      ...planningActions,
    ],

    executionPlan: {
      status:
        steps.length > 0
          ? 'available'
          : 'no-candidates',

      stepCount:
        steps.length,

      plannedTestCount:
        steps.reduce(
          (
            total,
            step
          ) =>
            total +
            step.testIds.length,
          0
        ),

      phases,

      steps,
    },

    reason:
      steps.length > 0
        ? (
            'Milestone 6.3 produced an advisory execution plan from Milestone 6.2 logical-test candidates. Ordering reuses existing Unified disposition, risk eligibility and P0-P4 priority semantics; no new weighted score is introduced and execution remains disabled.'
          )
        : (
            'Milestone 6.3 execution-planning capability is available, but there are no eligible test-selection candidates to plan. Execution remains disabled.'
          ),
  };
}

function failureEvidenceFor(
  step:
    AutonomousQaExecutionPlanStep,
  tests:
    DashboardTestResult[]
): AutonomousQaFailureEvidence[] {
  const targetTestIds =
    new Set(step.testIds);

  return tests
    .filter(
      test =>
        targetTestIds.has(test.id) &&
        isFailedCurrentRun(test)
    )
    .sort(
      (a, b) =>
        a.project.localeCompare(
          b.project
        ) ||
        a.id.localeCompare(b.id)
    )
    .map(
      test => ({
        testId:
          test.id,

        title:
          test.title,

        fullTitle:
          test.fullTitle,

        file:
          test.file,

        line:
          test.line,

        column:
          test.column,

        project:
          test.project,

        site:
          test.site,

        browserFamily:
          test.browserFamily,

        profile:
          test.profile,

        status:
          test.status,

        expectedStatus:
          test.expectedStatus,

        duration:
          test.duration,

        retry:
          test.retry,

        startedAt:
          test.startedAt,

        error:
          test.error,

        attachments:
          test.attachments,

        classification:
          test.classification,

        classificationReason:
          test.classificationReason,

        recommendation:
          test.recommendation,

        rootCause:
          test.rootCause,

        confidence:
          test.confidence,

        userImpact:
          test.userImpact,
      })
    );
}

function failureReproductionInstructions(
  step:
    AutonomousQaExecutionPlanStep,
  evidence:
    AutonomousQaFailureEvidence[]
): string[] {
  const projects =
    orderedUnique(
      evidence.map(
        item => item.project
      )
    );

  const attachmentKinds =
    orderedUnique(
      evidence.flatMap(
        item =>
          item.attachments.map(
            attachment =>
              attachment.kind ??
              'other'
          )
      )
    );

  const capturedEvidence =
    attachmentKinds.length > 0
      ? (
          `Review the recorded ${attachmentKinds.join(', ')} evidence before assigning a new classification.`
        )
      : (
          'No screenshot, video, trace or log attachment was captured; collect new evidence before assigning a new classification.'
        );

  return [
    `Locate the recorded logical test in ${step.file}.`,
    `Use only the recorded failing Playwright project metadata: ${projects.join(', ')}.`,
    'Reproduce the recorded browser and profile variants and compare the observed status with expectedStatus.',
    'Review the captured error message, stack and snippet without changing their original meaning.',
    capturedEvidence,
    'Record whether the failure reproduces and submit the new evidence for review; do not change release authority automatically.',
  ];
}

function buildFailureReproductionRecipes(
  steps:
    AutonomousQaExecutionPlanStep[],
  tests:
    DashboardTestResult[],
  candidates:
    AutonomousQaTestSelectionCandidate[]
): AutonomousQaFailureReproductionRecipe[] {
  const candidateById =
    new Map<
      string,
      AutonomousQaTestSelectionCandidate
    >();

  for (const candidate of candidates) {
    candidateById.set(
      candidate.id,
      candidate
    );
  }

  const recipes:
    AutonomousQaFailureReproductionRecipe[] = [];

  for (const step of steps) {
    const evidence =
      failureEvidenceFor(
        step,
        tests
      );

    if (evidence.length === 0) {
      continue;
    }

    const candidate =
      candidateById.get(
        step.testSelectionCandidateId
      );

    recipes.push({
      id:
        `failure-reproduction-${step.id}`,

      order:
        step.order,

      executionPlanStepId:
        step.id,

      testSelectionCandidateId:
        step.testSelectionCandidateId,

      phase:
        step.phase,

      title:
        step.title,

      file:
        step.file,

      site:
        step.site,

      projects:
        orderedUnique(
          evidence.map(
            item => item.project
          )
        ),

      testIds:
        evidence.map(
          item => item.testId
        ),

      evidenceCount:
        evidence.length,

      attachmentCount:
        evidence.reduce(
          (total, item) =>
            total +
            item.attachments.length,
          0
        ),

      confidence:
        candidate?.confidence ??
        null,

      instructions:
        failureReproductionInstructions(
          step,
          evidence
        ),

      evidence,

      provenance:
        step.provenance,

      executable:
        false,
    });
  }

  return recipes;
}

function failureReproductionActions(
  recipes:
    AutonomousQaFailureReproductionRecipe[]
): AutonomousQaActionCandidate[] {
  return recipes.map(
    recipe => ({
      id:
        `action-${recipe.id}`,

      kind:
        'failure-reproduction',

      state:
        'candidate',

      title:
        `Reproduce ${recipe.title}`,

      rationale:
        (
          'Current-run failure evidence exists for a test already selected and ordered by the advisory execution plan. ' +
          'The recipe preserves the recorded environment and evidence; autonomous execution remains disabled.'
        ),

      authority:
        'advisory-only',

      executable:
        false,

      confidence:
        recipe.confidence,

      provenance:
        recipe.provenance,

      testSelectionCandidateId:
        recipe.testSelectionCandidateId,

      executionPlanStepId:
        recipe.executionPlanStepId,

      failureReproductionRecipeId:
        recipe.id,
    })
  );
}

export function analyzeAutonomousQaFailureReproduction(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[]
): AutonomousQaAssessment {
  const planningAssessment =
    analyzeAutonomousQaExecutionPlanning(
      unifiedDecisionAssessment,
      releaseDecisionSource,
      tests,
      unifiedIssues
    );

  const executionPlan =
    planningAssessment.executionPlan;

  if (
    !unifiedDecisionAssessment ||
    !executionPlan ||
    executionPlan.status ===
      'not-verified'
  ) {
    return {
      ...planningAssessment,

      failureReproduction: {
        status:
          'not-verified',

        recipeCount:
          0,

        failedTestCount:
          0,

        attachmentCount:
          0,

        recipes:
          [],
      },

      reason:
        'Failure reproduction is not verified because the advisory execution plan or Unified Decision evidence is unavailable. Autonomous execution remains disabled.',
    };
  }

  const recipes =
    buildFailureReproductionRecipes(
      executionPlan.steps,
      tests,
      planningAssessment
        .testSelection?.candidates ??
        []
    );

  const reproductionActions =
    failureReproductionActions(
      recipes
    );

  const failedTestCount =
    recipes.reduce(
      (total, recipe) =>
        total +
        recipe.evidenceCount,
      0
    );

  const attachmentCount =
    recipes.reduce(
      (total, recipe) =>
        total +
        recipe.attachmentCount,
      0
    );

  return {
    ...planningAssessment,

    capabilityStatus:
      'failure-reproduction-advisory',

    executionEnabled:
      false,

    candidateActions: [
      ...planningAssessment.candidateActions,
      ...reproductionActions,
    ],

    failureReproduction: {
      status:
        recipes.length > 0
          ? 'available'
          : 'no-failures',

      recipeCount:
        recipes.length,

      failedTestCount,

      attachmentCount,

      recipes,
    },

    reason:
      recipes.length > 0
        ? (
            'Milestone 6.4 created advisory failure-reproduction recipes only for current-run non-passing test variants already selected and ordered by Milestones 6.2 and 6.3. Existing error and attachment evidence is preserved; no command is generated or executed and autonomous execution remains disabled.'
          )
        : (
            'Milestone 6.4 failure-reproduction capability is available, but the advisory execution plan contains no current-run non-passing test variants. No command is generated or executed and autonomous execution remains disabled.'
          ),
  };
}

function verificationExpectations(
  recipe:
    AutonomousQaFailureReproductionRecipe
): AutonomousQaVerificationExpectation[] {
  return recipe.evidence.map(
    evidence => ({
      testId:
        evidence.testId,

      project:
        evidence.project,

      site:
        evidence.site,

      browserFamily:
        evidence.browserFamily,

      profile:
        evidence.profile,

      previousStatus:
        evidence.status,

      expectedStatus:
        evidence.expectedStatus,

      evidenceRequirements: [
        `Collect a new result for ${evidence.project} / ${evidence.browserFamily} / ${evidence.profile}.`,
        `Confirm that the observed status matches ${evidence.expectedStatus}.`,
        'Confirm that the recorded failure signature is absent or explicitly explain why it remains.',
        'Retain new error and attachment evidence if the result is still non-passing.',
      ],
    })
  );
}

function verificationCriteria(
  recipe:
    AutonomousQaFailureReproductionRecipe
): string[] {
  const criteria = [
    `Review the correction against failure-reproduction recipe ${recipe.id}.`,
    'Verify every recorded project, browser and profile variant against its expectedStatus.',
    'Treat the previous failure evidence as historical context only; collect new evidence for the corrected build.',
    'If any target remains non-passing, preserve the new error and attachments and return it for diagnosis.',
  ];

  if (
    recipe.provenance.requirementIds.length > 0
  ) {
    criteria.push(
      `Review linked requirement evidence: ${recipe.provenance.requirementIds.join(', ')}.`
    );
  }

  if (
    recipe.provenance.criticalFlowIds.length > 0
  ) {
    criteria.push(
      `Review linked Critical Flow evidence: ${recipe.provenance.criticalFlowIds.join(', ')}.`
    );
  }

  if (
    recipe.provenance.flowScenarioIds.length > 0
  ) {
    criteria.push(
      `Review linked flow-scenario evidence: ${recipe.provenance.flowScenarioIds.join(', ')}.`
    );
  }

  criteria.push(
    'Submit the new evidence to Unified Decision review; this plan cannot update release readiness automatically.'
  );

  return criteria;
}

function buildVerificationPlans(
  recipes:
    AutonomousQaFailureReproductionRecipe[]
): AutonomousQaVerificationPlan[] {
  return recipes.map(
    recipe => ({
      id:
        `verification-${recipe.id}`,

      order:
        recipe.order,

      failureReproductionRecipeId:
        recipe.id,

      executionPlanStepId:
        recipe.executionPlanStepId,

      testSelectionCandidateId:
        recipe.testSelectionCandidateId,

      phase:
        recipe.phase,

      title:
        recipe.title,

      file:
        recipe.file,

      site:
        recipe.site,

      projects:
        recipe.projects,

      testIds:
        recipe.testIds,

      verificationState:
        'awaiting-new-evidence',

      requiresNewEvidence:
        true,

      verified:
        false,

      criteria:
        verificationCriteria(
          recipe
        ),

      expectations:
        verificationExpectations(
          recipe
        ),

      provenance:
        recipe.provenance,

      releaseDecisionUpdateAllowed:
        false,

      executable:
        false,
    })
  );
}

function verificationPlanningActions(
  plans:
    AutonomousQaVerificationPlan[]
): AutonomousQaActionCandidate[] {
  return plans.map(
    plan => ({
      id:
        `action-${plan.id}`,

      kind:
        'verification',

      state:
        'candidate',

      title:
        `Verify ${plan.title}`,

      rationale:
        (
          'A current-run failure has an advisory reproduction recipe and requires new post-correction evidence. ' +
          'The plan defines verification criteria only; autonomous execution and release-decision updates remain disabled.'
        ),

      authority:
        'advisory-only',

      executable:
        false,

      confidence:
        null,

      provenance:
        plan.provenance,

      testSelectionCandidateId:
        plan.testSelectionCandidateId,

      executionPlanStepId:
        plan.executionPlanStepId,

      failureReproductionRecipeId:
        plan.failureReproductionRecipeId,

      verificationPlanId:
        plan.id,
    })
  );
}

export function analyzeAutonomousQaVerificationPlanning(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[]
): AutonomousQaAssessment {
  const reproductionAssessment =
    analyzeAutonomousQaFailureReproduction(
      unifiedDecisionAssessment,
      releaseDecisionSource,
      tests,
      unifiedIssues
    );

  const failureReproduction =
    reproductionAssessment.failureReproduction;

  if (
    !unifiedDecisionAssessment ||
    !failureReproduction ||
    failureReproduction.status ===
      'not-verified'
  ) {
    return {
      ...reproductionAssessment,

      verification: {
        status:
          'not-verified',

        planCount:
          0,

        targetTestCount:
          0,

        awaitingEvidenceCount:
          0,

        verifiedPlanCount:
          0,

        plans:
          [],
      },

      reason:
        'Verification planning is not available because failure-reproduction or Unified Decision evidence is unavailable. No verification result is inferred, autonomous execution remains disabled and release authority is unchanged.',
    };
  }

  const plans =
    buildVerificationPlans(
      failureReproduction.recipes
    );

  const verificationActions =
    verificationPlanningActions(
      plans
    );

  const targetTestCount =
    plans.reduce(
      (total, plan) =>
        total +
        plan.testIds.length,
      0
    );

  const awaitingEvidenceCount =
    plans.reduce(
      (total, plan) =>
        total +
        plan.expectations.length,
      0
    );

  return {
    ...reproductionAssessment,

    capabilityStatus:
      'verification-planning-advisory',

    executionEnabled:
      false,

    candidateActions: [
      ...reproductionAssessment.candidateActions,
      ...verificationActions,
    ],

    verification: {
      status:
        plans.length > 0
          ? 'available'
          : 'no-failures',

      planCount:
        plans.length,

      targetTestCount,

      awaitingEvidenceCount,

      verifiedPlanCount:
        0,

      plans,
    },

    reason:
      plans.length > 0
        ? (
            'Milestone 6.5 created advisory verification plans from Milestone 6.4 failure-reproduction recipes. Every plan remains awaiting new evidence; no failure is marked resolved, no command is generated or executed, and Unified Decision release authority is unchanged.'
          )
        : (
            'Milestone 6.5 verification planning is available, but there are no current-run failure-reproduction recipes to verify. No verification result is inferred, no command is generated or executed, and Unified Decision release authority is unchanged.'
          ),
  };
}

function changeImpactScope(
  plan:
    AutonomousQaVerificationPlan
): AutonomousQaChangeImpactScope {
  return {
    sites:
      orderedUnique([
        plan.site,
        ...plan.expectations.map(
          expectation =>
            expectation.site
        ),
      ]),

    projects:
      orderedUnique([
        ...plan.projects,
        ...plan.expectations.map(
          expectation =>
            expectation.project
        ),
      ]),

    intelligenceSources:
      plan.provenance
        .intelligenceSources,

    qualityDimensions:
      plan.provenance
        .qualityDimensions,

    unifiedDecisionUnitIds:
      plan.provenance
        .unifiedDecisionUnitIds,

    issueFingerprints:
      plan.provenance
        .issueFingerprints,

    requirementIds:
      plan.provenance
        .requirementIds,

    criticalFlowIds:
      plan.provenance
        .criticalFlowIds,

    flowScenarioIds:
      plan.provenance
        .flowScenarioIds,
  };
}

function changeImpactRationale(
  plan:
    AutonomousQaVerificationPlan,
  candidate:
    AutonomousQaTestSelectionCandidate | undefined
): string[] {
  const rationale = [
    'Potential impact is bounded by the existing verification plan and its recorded evidence links; no source-code or configuration change evidence was provided.',
    `Existing Unified ordering context is ${candidate?.priority ?? 'not-verified'} / ${candidate?.disposition ?? 'not-verified'}; risk eligibility remains ${candidate?.riskEligible ?? false}.`,
  ];

  if (
    plan.provenance.qualityDimensions.length > 0
  ) {
    rationale.push(
      `Linked quality dimensions: ${plan.provenance.qualityDimensions.join(', ')}.`
    );
  }

  if (
    plan.provenance.requirementIds.length > 0
  ) {
    rationale.push(
      `Linked requirements may require renewed evidence: ${plan.provenance.requirementIds.join(', ')}.`
    );
  }

  if (
    plan.provenance.criticalFlowIds.length > 0 ||
    plan.provenance.flowScenarioIds.length > 0
  ) {
    rationale.push(
      'Linked Critical Flow or flow-scenario evidence may require review after the correction.'
    );
  }

  return rationale;
}

function changeImpactReviewChecklist(
  plan:
    AutonomousQaVerificationPlan
): string[] {
  const checklist = [
    'Identify and review the actual code, configuration or dependency change before confirming impact.',
    `Review every recorded target project: ${plan.projects.join(', ')}.`,
    'Collect the new evidence required by the linked M6.5 verification plan.',
    'Check whether previously linked issue fingerprints remain applicable after the correction.',
  ];

  if (
    plan.provenance.requirementIds.length > 0
  ) {
    checklist.push(
      'Reassess the linked requirement evidence and its acceptance-criteria coverage.'
    );
  }

  if (
    plan.provenance.criticalFlowIds.length > 0 ||
    plan.provenance.flowScenarioIds.length > 0
  ) {
    checklist.push(
      'Reassess linked Critical Flow and flow-scenario evidence.'
    );
  }

  checklist.push(
    'Submit reviewed evidence to Unified Decision; this candidate cannot change release readiness automatically.'
  );

  return checklist;
}

function buildChangeImpactCandidates(
  plans:
    AutonomousQaVerificationPlan[],
  selectionCandidates:
    AutonomousQaTestSelectionCandidate[]
): AutonomousQaChangeImpactCandidate[] {
  const selectionById =
    new Map<
      string,
      AutonomousQaTestSelectionCandidate
    >();

  for (
    const candidate
    of selectionCandidates
  ) {
    selectionById.set(
      candidate.id,
      candidate
    );
  }

  return plans.map(
    plan => {
      const selectionCandidate =
        selectionById.get(
          plan.testSelectionCandidateId
        );

      return {
        id:
          `change-impact-${plan.id}`,

        order:
          plan.order,

        verificationPlanId:
          plan.id,

        failureReproductionRecipeId:
          plan.failureReproductionRecipeId,

        executionPlanStepId:
          plan.executionPlanStepId,

        testSelectionCandidateId:
          plan.testSelectionCandidateId,

        phase:
          plan.phase,

        title:
          plan.title,

        file:
          plan.file,

        testIds:
          plan.testIds,

        priority:
          selectionCandidate?.priority ??
          null,

        disposition:
          selectionCandidate?.disposition ??
          null,

        evidenceState:
          selectionCandidate?.evidenceState ??
          null,

        riskEligible:
          selectionCandidate?.riskEligible ??
          false,

        confidence:
          selectionCandidate?.confidence ??
          null,

        state:
          'potential-impact',

        scope:
          changeImpactScope(
            plan
          ),

        rationale:
          changeImpactRationale(
            plan,
            selectionCandidate
          ),

        reviewChecklist:
          changeImpactReviewChecklist(
            plan
          ),

        changeEvidenceAvailable:
          false,

        impactConfirmed:
          false,

        requiresHumanReview:
          true,

        provenance:
          plan.provenance,

        releaseDecisionUpdateAllowed:
          false,

        executable:
          false,
      };
    }
  );
}

function changeImpactActions(
  candidates:
    AutonomousQaChangeImpactCandidate[]
): AutonomousQaActionCandidate[] {
  return candidates.map(
    candidate => ({
      id:
        `action-${candidate.id}`,

      kind:
        'change-impact',

      state:
        'candidate',

      title:
        `Review potential impact for ${candidate.title}`,

      rationale:
        (
          'Existing Autonomous QA provenance identifies a bounded potential review scope. ' +
          'No change evidence was provided, so impact remains unconfirmed and requires human review.'
        ),

      authority:
        'advisory-only',

      executable:
        false,

      confidence:
        candidate.confidence,

      provenance:
        candidate.provenance,

      testSelectionCandidateId:
        candidate.testSelectionCandidateId,

      executionPlanStepId:
        candidate.executionPlanStepId,

      failureReproductionRecipeId:
        candidate.failureReproductionRecipeId,

      verificationPlanId:
        candidate.verificationPlanId,

      changeImpactCandidateId:
        candidate.id,
    })
  );
}

export function analyzeAutonomousQaChangeImpact(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[]
): AutonomousQaAssessment {
  const verificationAssessment =
    analyzeAutonomousQaVerificationPlanning(
      unifiedDecisionAssessment,
      releaseDecisionSource,
      tests,
      unifiedIssues
    );

  const verification =
    verificationAssessment.verification;

  if (
    !unifiedDecisionAssessment ||
    !verification ||
    verification.status ===
      'not-verified'
  ) {
    return {
      ...verificationAssessment,

      changeImpact: {
        status:
          'not-verified',

        candidateCount:
          0,

        targetTestCount:
          0,

        affectedSiteCount:
          0,

        affectedProjectCount:
          0,

        confirmedImpactCount:
          0,

        candidates:
          [],
      },

      reason:
        'Potential change-impact analysis is not available because verification-planning or Unified Decision evidence is unavailable. No impact is inferred, autonomous execution remains disabled and release authority is unchanged.',
    };
  }

  const candidates =
    buildChangeImpactCandidates(
      verification.plans,
      verificationAssessment
        .testSelection?.candidates ??
        []
    );

  const impactActions =
    changeImpactActions(
      candidates
    );

  const targetTestCount =
    candidates.reduce(
      (total, candidate) =>
        total +
        candidate.testIds.length,
      0
    );

  const affectedSites =
    orderedUnique(
      candidates.flatMap(
        candidate =>
          candidate.scope.sites
      )
    );

  const affectedProjects =
    orderedUnique(
      candidates.flatMap(
        candidate =>
          candidate.scope.projects
      )
    );

  return {
    ...verificationAssessment,

    capabilityStatus:
      'change-impact-advisory',

    executionEnabled:
      false,

    candidateActions: [
      ...verificationAssessment.candidateActions,
      ...impactActions,
    ],

    changeImpact: {
      status:
        candidates.length > 0
          ? 'available'
          : 'no-targets',

      candidateCount:
        candidates.length,

      targetTestCount,

      affectedSiteCount:
        affectedSites.length,

      affectedProjectCount:
        affectedProjects.length,

      confirmedImpactCount:
        0,

      candidates,
    },

    reason:
      candidates.length > 0
        ? (
            'Milestone 6.6 created advisory potential change-impact candidates from M6.5 verification plans and existing Unified Decision provenance. No change evidence was provided, every impact remains unconfirmed, no new weighted score is introduced, and autonomous execution and release-decision updates remain disabled.'
          )
        : (
            'Milestone 6.6 change-impact analysis is available, but there are no M6.5 verification targets to scope. No impact is inferred, no command is generated or executed, and Unified Decision release authority is unchanged.'
          ),
  };
}

function canonicalQualityDriftHistory(
  history:
    DashboardRun[]
): DashboardRun[] {
  return history.filter(
    run =>
      run.schemaVersion === 5 &&
      run.releaseDecisionSource ===
        'unified-v5' &&
      Boolean(
        run.unifiedDecisionAssessment
      )
  );
}

function qualityDriftSetDirection(
  addedIds:
    string[],
  removedIds:
    string[]
): AutonomousQaQualityDriftDirection {
  if (
    addedIds.length > 0 &&
    removedIds.length === 0
  ) {
    return 'potential-regression';
  }

  if (
    removedIds.length > 0 &&
    addedIds.length === 0
  ) {
    return 'potential-improvement';
  }

  if (
    addedIds.length > 0 ||
    removedIds.length > 0
  ) {
    return 'changed';
  }

  return 'stable';
}

function qualityDriftStateDirection(
  baselineState:
    UnifiedDecisionAssessment['state'],
  currentState:
    UnifiedDecisionAssessment['state']
): AutonomousQaQualityDriftDirection {
  if (
    baselineState === currentState
  ) {
    return 'stable';
  }

  if (
    baselineState === 'not-verified' ||
    currentState === 'not-verified'
  ) {
    return 'changed';
  }

  const rank = {
    ready: 0,
    'ready-with-warnings': 1,
    'not-ready': 2,
  } as const;

  return rank[currentState] >
    rank[baselineState]
    ? 'potential-regression'
    : 'potential-improvement';
}

function qualityDriftDifference(
  currentValues:
    string[],
  baselineValues:
    string[]
): {
  addedIds: string[];
  removedIds: string[];
} {
  const currentSet =
    new Set(currentValues);

  const baselineSet =
    new Set(baselineValues);

  return {
    addedIds:
      orderedUnique(
        currentValues.filter(
          value =>
            !baselineSet.has(value)
        )
      ),

    removedIds:
      orderedUnique(
        baselineValues.filter(
          value =>
            !currentSet.has(value)
        )
      ),
  };
}

function qualityDriftSetSignal(
  kind:
    Exclude<
      AutonomousQaQualityDriftSignal['kind'],
      'decision-state'
    >,
  label:
    string,
  baselineValues:
    string[],
  currentValues:
    string[],
  baselineRun:
    DashboardRun,
  confidence:
    number | null,
  provenance:
    AutonomousQaEvidenceProvenance
): AutonomousQaQualityDriftSignal {
  const {
    addedIds,
    removedIds,
  } = qualityDriftDifference(
    currentValues,
    baselineValues
  );

  return {
    id:
      `quality-drift-${kind}`,

    kind,

    direction:
      qualityDriftSetDirection(
        addedIds,
        removedIds
      ),

    baselineRunId:
      baselineRun.runId,

    baselineFinishedAt:
      baselineRun.finishedAt,

    baselineValue:
      String(
        baselineValues.length
      ),

    currentValue:
      String(
        currentValues.length
      ),

    addedIds,
    removedIds,

    summary:
      `${label} changed from ${baselineValues.length} to ${currentValues.length}; ${addedIds.length} added and ${removedIds.length} removed.`,

    confidence,

    historicalEvidenceAvailable:
      true,

    driftConfirmed:
      false,

    requiresHumanReview:
      true,

    provenance,

    releaseDecisionUpdateAllowed:
      false,

    executable:
      false,
  };
}

function buildQualityDriftSignals(
  current:
    UnifiedDecisionAssessment,
  baselineRun:
    DashboardRun,
  provenance:
    AutonomousQaEvidenceProvenance
): AutonomousQaQualityDriftSignal[] {
  const baseline =
    baselineRun.unifiedDecisionAssessment;

  if (!baseline) {
    return [];
  }

  const currentBlockingUnits =
    current.decisionUnits
      .filter(
        unit => unit.blocking
      )
      .map(
        unit => unit.id
      );

  const baselineBlockingUnits =
    baseline.decisionUnits
      .filter(
        unit => unit.blocking
      )
      .map(
        unit => unit.id
      );

  const currentRiskEligibleUnits =
    current.decisionUnits
      .filter(
        unit => unit.riskEligible
      )
      .map(
        unit => unit.id
      );

  const baselineRiskEligibleUnits =
    baseline.decisionUnits
      .filter(
        unit => unit.riskEligible
      )
      .map(
        unit => unit.id
      );

  const currentFingerprints =
    orderedUnique(
      current.decisionUnits.flatMap(
        unit =>
          unit.issueFingerprints
      )
    );

  const baselineFingerprints =
    orderedUnique(
      baseline.decisionUnits.flatMap(
        unit =>
          unit.issueFingerprints
      )
    );

  return [
    {
      id:
        'quality-drift-decision-state',

      kind:
        'decision-state',

      direction:
        qualityDriftStateDirection(
          baseline.state,
          current.state
        ),

      baselineRunId:
        baselineRun.runId,

      baselineFinishedAt:
        baselineRun.finishedAt,

      baselineValue:
        baseline.state,

      currentValue:
        current.state,

      addedIds:
        [],

      removedIds:
        [],

      summary:
        `Unified Decision state changed from ${baseline.state} to ${current.state}.`,

      confidence:
        current.confidence,

      historicalEvidenceAvailable:
        true,

      driftConfirmed:
        false,

      requiresHumanReview:
        true,

      provenance,

      releaseDecisionUpdateAllowed:
        false,

      executable:
        false,
    },

    qualityDriftSetSignal(
      'blocking-units',
      'Blocking Unified Decision units',
      baselineBlockingUnits,
      currentBlockingUnits,
      baselineRun,
      current.confidence,
      provenance
    ),

    qualityDriftSetSignal(
      'risk-eligible-units',
      'Risk-eligible Unified Decision units',
      baselineRiskEligibleUnits,
      currentRiskEligibleUnits,
      baselineRun,
      current.confidence,
      provenance
    ),

    qualityDriftSetSignal(
      'verification-gaps',
      'Verification-gap dimensions',
      baseline.verificationGapDimensions,
      current.verificationGapDimensions,
      baselineRun,
      current.confidence,
      provenance
    ),

    qualityDriftSetSignal(
      'issue-fingerprints',
      'Unified issue fingerprints',
      baselineFingerprints,
      currentFingerprints,
      baselineRun,
      current.confidence,
      provenance
    ),
  ];
}

function qualityDriftActions(
  signals:
    AutonomousQaQualityDriftSignal[]
): AutonomousQaActionCandidate[] {
  return signals
    .filter(
      signal =>
        signal.direction !==
          'stable'
    )
    .map(
      signal => ({
        id:
          `action-${signal.id}`,

        kind:
          'quality-drift',

        state:
          'candidate',

        title:
          `Review ${signal.kind} comparison`,

        rationale:
          (
            `Historical comparison produced ${signal.direction} evidence. ` +
            'The signal is advisory, pairwise and unconfirmed; human review is required.'
          ),

        authority:
          'advisory-only',

        executable:
          false,

        confidence:
          signal.confidence,

        provenance:
          signal.provenance,

        qualityDriftSignalId:
          signal.id,
      })
    );
}

export function analyzeAutonomousQaQualityDrift(
  unifiedDecisionAssessment:
    UnifiedDecisionAssessment | undefined,
  releaseDecisionSource:
    ReleaseDecisionSource | null,
  tests:
    DashboardTestResult[],
  unifiedIssues:
    TestLinkableIssue[],
  history:
    DashboardRun[]
): AutonomousQaAssessment {
  const impactAssessment =
    analyzeAutonomousQaChangeImpact(
      unifiedDecisionAssessment,
      releaseDecisionSource,
      tests,
      unifiedIssues
    );

  const changeImpact =
    impactAssessment.changeImpact;

  if (
    !unifiedDecisionAssessment ||
    !changeImpact ||
    changeImpact.status ===
      'not-verified'
  ) {
    return {
      ...impactAssessment,

      qualityDrift: {
        status:
          'not-verified',

        baselineRunId:
          null,

        baselineFinishedAt:
          null,

        comparedRunCount:
          0,

        signalCount:
          0,

        potentialRegressionCount:
          0,

        potentialImprovementCount:
          0,

        changedSignalCount:
          0,

        stableSignalCount:
          0,

        trendClaimed:
          false,

        confirmedDriftCount:
          0,

        signals:
          [],
      },

      reason:
        'Quality-drift comparison is not verified because current Unified Decision or change-impact evidence is unavailable. No drift or trend is inferred, autonomous execution remains disabled and release authority is unchanged.',
    };
  }

  const canonicalHistory =
    canonicalQualityDriftHistory(
      history
    );

  const baselineRun =
    canonicalHistory[
      canonicalHistory.length - 1
    ];

  if (!baselineRun) {
    return {
      ...impactAssessment,

      capabilityStatus:
        'quality-drift-advisory',

      executionEnabled:
        false,

      qualityDrift: {
        status:
          'no-baseline',

        baselineRunId:
          null,

        baselineFinishedAt:
          null,

        comparedRunCount:
          0,

        signalCount:
          0,

        potentialRegressionCount:
          0,

        potentialImprovementCount:
          0,

        changedSignalCount:
          0,

        stableSignalCount:
          0,

        trendClaimed:
          false,

        confirmedDriftCount:
          0,

        signals:
          [],
      },

      reason:
        'Milestone 6.7 quality-drift comparison has no prior canonical schema-v5 Unified Decision baseline. No drift or trend is inferred, no command is generated or executed, and release authority is unchanged.',
    };
  }

  const signals =
    buildQualityDriftSignals(
      unifiedDecisionAssessment,
      baselineRun,
      impactAssessment.provenance
    );

  const driftActions =
    qualityDriftActions(
      signals
    );

  const countDirection = (
    direction:
      AutonomousQaQualityDriftDirection
  ): number =>
    signals.filter(
      signal =>
        signal.direction === direction
    ).length;

  return {
    ...impactAssessment,

    capabilityStatus:
      'quality-drift-advisory',

    executionEnabled:
      false,

    candidateActions: [
      ...impactAssessment.candidateActions,
      ...driftActions,
    ],

    qualityDrift: {
      status:
        'available',

      baselineRunId:
        baselineRun.runId,

      baselineFinishedAt:
        baselineRun.finishedAt,

      comparedRunCount:
        1,

      signalCount:
        signals.length,

      potentialRegressionCount:
        countDirection(
          'potential-regression'
        ),

      potentialImprovementCount:
        countDirection(
          'potential-improvement'
        ),

      changedSignalCount:
        countDirection(
          'changed'
        ),

      stableSignalCount:
        countDirection(
          'stable'
        ),

      trendClaimed:
        false,

      confirmedDriftCount:
        0,

      signals,
    },

    reason:
      (
        'Milestone 6.7 compared the current canonical Unified Decision assessment with exactly one prior canonical schema-v5 run. Signals remain advisory and unconfirmed; no multi-run trend, new weighted score, autonomous execution or release-decision update is introduced.'
      ),
  };
}
