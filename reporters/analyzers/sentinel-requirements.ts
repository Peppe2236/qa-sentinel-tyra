import type {
  DashboardTestResult,
  IntelligenceSource,
  ReleaseAssessment,
  RequirementCoverage,
  RequirementDefinition,
  RequirementEvidence,
  RequirementStatus,
  RiskLevel,
} from '../models/types';


interface TestIssueLink {
  fingerprint: string;

  sourceTestIds:
    string[];
}


function unique<T>(
  values: T[]
): T[] {
  return [
    ...new Set(values),
  ];
}


function evidenceStatusForTest(
  test: DashboardTestResult
): RequirementEvidence['status'] {
  if (test.status === 'passed') {
    return 'passed';
  }

  if (
    test.status === 'failed' ||
    test.status === 'timedOut' ||
    test.status === 'interrupted'
  ) {
    const classification =
      String(test.classification ?? '')
        .toLowerCase();

    if (
      classification === 'automation-issue' ||
      classification === 'needs-investigation' ||
      classification === 'warning'
    ) {
      return 'unknown';
    }

    return 'failed';
  }

  return 'unknown';
}


function issueFingerprintForTest(
  testId: string,

  issues:
    TestIssueLink[]
): string | undefined {
  return issues.find(
    issue =>
      issue.sourceTestIds.includes(
        testId
      )
  )?.fingerprint;
}


export function buildRequirementEvidenceFromTests(
  tests:
    DashboardTestResult[],

  issues:
    TestIssueLink[] = []
): RequirementEvidence[] {
  const evidence:
    RequirementEvidence[] = [];

  for (const test of tests) {
    const requirementIds =
      test.requirementIds ??
      [];

    if (
      requirementIds.length === 0
    ) {
      continue;
    }

    for (
      const requirementId
      of requirementIds
    ) {
      evidence.push({
        source:
          'test',

        evidenceId:
          test.id,

        requirementId,

        acceptanceCriteriaIds:
          test.acceptanceCriteriaIds ??
          [],

        status:
          evidenceStatusForTest(
            test
          ),

        title:
          test.fullTitle ||
          test.title,

        issueFingerprint:
          issueFingerprintForTest(
            test.id,
            issues
          ),
      });
    }
  }

  return evidence;
}


function validateEvidenceReferences(
  requirements:
    RequirementDefinition[],

  evidence:
    RequirementEvidence[]
): void {
  const requirementMap =
    new Map(
      requirements.map(
        requirement => [
          requirement.id,
          requirement,
        ]
      )
    );

  for (const item of evidence) {
    const requirement =
      requirementMap.get(
        item.requirementId
      );

    if (!requirement) {
      throw new Error(
        `Requirement evidence references unknown requirement: ${item.requirementId}`
      );
    }

    const criteria =
      new Set(
        (
          requirement
            .acceptanceCriteria ??
          []
        ).map(
          criterion =>
            criterion.id
        )
      );

    for (
      const criterionId
      of item.acceptanceCriteriaIds ??
      []
    ) {
      if (
        !criteria.has(
          criterionId
        )
      ) {
        throw new Error(
          `Requirement evidence references unknown acceptance criterion ${criterionId} for ${requirement.id}`
        );
      }
    }
  }
}


function statusFromEvidence(
  evidence:
    RequirementEvidence[]
): RequirementStatus {
  if (
    evidence.length === 0
  ) {
    return 'not-tested';
  }

  if (
    evidence.some(
      item =>
        item.status ===
        'failed'
    )
  ) {
    return 'fail';
  }

  if (
    evidence.every(
      item =>
        item.status ===
        'passed'
    )
  ) {
    return 'pass';
  }

  return 'partially-verified';
}


export function analyzeRequirementCoverage(
  requirements:
    RequirementDefinition[],

  evidence:
    RequirementEvidence[]
): RequirementCoverage[] {
  validateEvidenceReferences(
    requirements,
    evidence
  );

  return requirements.map(
    requirement => {
      const relatedEvidence =
        evidence.filter(
          item =>
            item.requirementId ===
            requirement.id
        );

      const criteria =
        (
          requirement
            .acceptanceCriteria ??
          []
        ).map(
          criterion => {
            const criterionEvidence =
              relatedEvidence.filter(
                item =>
                  (
                    item
                      .acceptanceCriteriaIds ??
                    []
                  ).includes(
                    criterion.id
                  )
              );

            const status =
              statusFromEvidence(
                criterionEvidence
              );

            return {
              criterionId:
                criterion.id,

              title:
                criterion.title,

              critical:
                criterion.critical ??
                false,

              status,

              evidenceCount:
                criterionEvidence.length,

              passedEvidenceCount:
                criterionEvidence.filter(
                  item =>
                    item.status ===
                    'passed'
                ).length,

              failedEvidenceCount:
                criterionEvidence.filter(
                  item =>
                    item.status ===
                    'failed'
                ).length,
            };
          }
        );

      let status:
        RequirementStatus;

      let reason:
        string;

      if (
        relatedEvidence.length === 0
      ) {
        status =
          'not-tested';

        reason =
          'No evidence source currently verifies this requirement.';
      }

      else if (
        relatedEvidence.some(
          item =>
            item.status ===
            'failed'
        )
      ) {
        status =
          'fail';

        reason =
          'At least one linked verification failed.';
      }

      else if (
        criteria.length === 0
      ) {
        status =
          'partially-verified';

        reason =
          'Evidence exists, but no acceptance criteria are defined, so the requirement cannot be fully verified.';
      }

      else if (
        criteria.some(
          criterion =>
            criterion.status ===
            'fail'
        )
      ) {
        status =
          'fail';

        reason =
          'At least one acceptance criterion failed verification.';
      }

      else if (
        criteria.every(
          criterion =>
            criterion.status ===
            'pass'
        )
      ) {
        status =
          'pass';

        reason =
          'All defined acceptance criteria have passing evidence.';
      }

      else {
        status =
          'partially-verified';

        reason =
          'Some acceptance criteria are verified, but coverage is incomplete.';
      }

      const coveredBySources =
        unique(
          relatedEvidence.map(
            item =>
              item.source
          )
        ) as
          IntelligenceSource[];

      const issueFingerprints =
        unique(
          relatedEvidence
            .map(
              item =>
                item.issueFingerprint
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        );

      return {
        requirementId:
          requirement.id,

        title:
          requirement.title,

        critical:
          requirement.critical ??
          false,

        status,

        reason,

        evidenceCount:
          relatedEvidence.length,

        passedEvidenceCount:
          relatedEvidence.filter(
            item =>
              item.status ===
              'passed'
          ).length,

        failedEvidenceCount:
          relatedEvidence.filter(
            item =>
              item.status ===
              'failed'
          ).length,

        coveredBySources,

        issueFingerprints,

        criteria,
      };
    }
  );
}


function requirementBlocksRelease(
  requirement:
    RequirementCoverage
): boolean {
  if (
    requirement.critical &&
    requirement.status !==
      'pass'
  ) {
    return true;
  }

  return requirement.criteria.some(
    criterion =>
      criterion.critical &&
      criterion.status !==
        'pass'
  );
}


const RISK_ORDER:
  Record<
    RiskLevel,
    number
  > = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };


function elevatedRisk(
  current:
    RiskLevel,

  required:
    RiskLevel
): RiskLevel {
  return (
    RISK_ORDER[required] >
    RISK_ORDER[current]
      ? required
      : current
  );
}


export function applyRequirementReleaseGate(
  assessment:
    ReleaseAssessment,

  coverage:
    RequirementCoverage[]
): ReleaseAssessment {
  const blockingRequirements =
    coverage.filter(
      requirementBlocksRelease
    ).length;

  const requirementGaps =
    coverage.filter(
      requirement =>
        requirement.status !==
        'pass'
    ).length;

  const nonBlockingFailures =
    coverage.filter(
      requirement =>
        !requirementBlocksRelease(
          requirement
        ) &&
        requirement.status ===
          'fail'
    ).length;

  const incompleteRequirements =
    coverage.filter(
      requirement =>
        !requirementBlocksRelease(
          requirement
        ) &&
        (
          requirement.status ===
            'partially-verified' ||
          requirement.status ===
            'not-tested'
        )
    ).length;

  if (
    blockingRequirements > 0
  ) {
    return {
      ...assessment,

      status:
        'not-ready',

      risk:
        elevatedRisk(
          assessment.risk,
          'critical'
        ),

      blockingRequirements,

      requirementGaps,

      verdict:
        `${assessment.verdict} ${blockingRequirements} critical requirement${blockingRequirements === 1 ? '' : 's'} are not fully verified.`,

      recommendedAction:
        `${assessment.recommendedAction} Resolve or fully verify all critical requirement gaps before release.`,
    };
  }

  if (
    nonBlockingFailures > 0
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevatedRisk(
          assessment.risk,
          'high'
        ),

      blockingRequirements: 0,

      requirementGaps,

      verdict:
        `${assessment.verdict} ${nonBlockingFailures} non-critical requirement${nonBlockingFailures === 1 ? '' : 's'} currently fail verification.`,

      recommendedAction:
        `${assessment.recommendedAction} Review and resolve failing requirement verification before release where possible.`,
    };
  }

  if (
    incompleteRequirements > 0
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevatedRisk(
          assessment.risk,
          'medium'
        ),

      blockingRequirements: 0,

      requirementGaps,

      verdict:
        `${assessment.verdict} ${incompleteRequirements} requirement${incompleteRequirements === 1 ? '' : 's'} have incomplete verification coverage.`,

      recommendedAction:
        `${assessment.recommendedAction} Complete missing requirement verification and acceptance-criteria coverage.`,
    };
  }

  return {
    ...assessment,

    blockingRequirements: 0,

    requirementGaps: 0,
  };
}
