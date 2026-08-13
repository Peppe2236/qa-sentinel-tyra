import type {
  CriticalFlowCoverage,
  CriticalFlowDefinition,
  CriticalFlowEvidence,
  CriticalFlowStatus,
  DashboardTestResult,
  IntelligenceSource,
  ReleaseAssessment,
  RiskLevel,
} from '../models/types';


function unique<T>(
  values: T[]
): T[] {
  return [
    ...new Set(values),
  ];
}


function statusFromEvidence(
  evidence:
    CriticalFlowEvidence[]
): CriticalFlowStatus {
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

  return 'degraded';
}


function validateEvidenceReferences(
  flows:
    CriticalFlowDefinition[],

  evidence:
    CriticalFlowEvidence[]
): void {
  const flowMap =
    new Map(
      flows.map(
        flow => [
          flow.id,
          flow,
        ]
      )
    );

  for (const item of evidence) {
    const flow =
      flowMap.get(
        item.flowId
      );

    if (!flow) {
      throw new Error(
        `Critical Flow evidence references unknown flow: ${item.flowId}`
      );
    }

    const scenarioIds =
      new Set(
        flow.scenarios.map(
          scenario =>
            scenario.id
        )
      );

    for (
      const scenarioId
      of item.scenarioIds ??
      []
    ) {
      if (
        !scenarioIds.has(
          scenarioId
        )
      ) {
        throw new Error(
          `Critical Flow evidence references unknown scenario ${scenarioId} for ${flow.id}`
        );
      }
    }
  }
}


export function analyzeCriticalFlowCoverage(
  flows:
    CriticalFlowDefinition[],

  evidence:
    CriticalFlowEvidence[]
): CriticalFlowCoverage[] {
  validateEvidenceReferences(
    flows,
    evidence
  );

  return flows.map(
    flow => {
      const relatedEvidence =
        evidence.filter(
          item =>
            item.flowId ===
            flow.id
        );

      const scenarios =
        flow.scenarios.map(
          scenario => {
            const scenarioEvidence =
              relatedEvidence.filter(
                item =>
                  (
                    item.scenarioIds ??
                    []
                  ).includes(
                    scenario.id
                  )
              );

            return {
              scenarioId:
                scenario.id,

              title:
                scenario.title,

              type:
                scenario.type,

              critical:
                scenario.critical ??
                false,

              status:
                statusFromEvidence(
                  scenarioEvidence
                ),

              evidenceCount:
                scenarioEvidence.length,

              passedEvidenceCount:
                scenarioEvidence.filter(
                  item =>
                    item.status ===
                    'passed'
                ).length,

              failedEvidenceCount:
                scenarioEvidence.filter(
                  item =>
                    item.status ===
                    'failed'
                ).length,
            };
          }
        );

      let status:
        CriticalFlowStatus;

      let reason:
        string;

      if (
        relatedEvidence.length === 0
      ) {
        status =
          'not-tested';

        reason =
          'No evidence source currently verifies this Critical Flow.';
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
          'At least one linked Critical Flow verification failed.';
      }

      else if (
        scenarios.length === 0
      ) {
        status =
          'degraded';

        reason =
          'Evidence exists, but no flow scenarios are defined, so the journey cannot be fully verified.';
      }

      else if (
        scenarios.some(
          scenario =>
            scenario.status ===
            'fail'
        )
      ) {
        status =
          'fail';

        reason =
          'At least one Critical Flow scenario failed.';
      }

      else if (
        scenarios.every(
          scenario =>
            scenario.status ===
            'pass'
        )
      ) {
        status =
          'pass';

        reason =
          'All defined Critical Flow scenarios have passing evidence.';
      }

      else {
        status =
          'degraded';

        reason =
          'The Critical Flow has incomplete scenario coverage.';
      }

      const coveredBySources =
        unique(
          relatedEvidence.map(
            item =>
              item.source
          )
        ) as IntelligenceSource[];

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
        flowId:
          flow.id,

        title:
          flow.title,

        critical:
          flow.critical ??
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

        scenarios,
      };
    }
  );
}



interface CriticalFlowTestIssueLink {
  fingerprint: string;

  sourceTestIds:
    string[];
}


function issueFingerprintForTest(
  testId: string,

  issues:
    CriticalFlowTestIssueLink[]
): string | undefined {
  return issues.find(
    issue =>
      issue.sourceTestIds.includes(
        testId
      )
  )?.fingerprint;
}


export function buildCriticalFlowEvidenceFromTests(
  tests:
    DashboardTestResult[],

  issues:
    CriticalFlowTestIssueLink[] = []
): CriticalFlowEvidence[] {
  const evidence:
    CriticalFlowEvidence[] = [];

  for (const test of tests) {
    const flowIds =
      test.criticalFlowIds?.length
        ? test.criticalFlowIds
        : test.criticalFlow
          ? [test.criticalFlow]
          : [];

    if (
      flowIds.length === 0
    ) {
      continue;
    }

    let status:
      CriticalFlowEvidence['status'];

    if (
      test.status === 'passed'
    ) {
      status =
        'passed';
    }

    else if (
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
        status = 'unknown';
      }

      else {
        status = 'failed';
      }
    }

    else {
      status = 'unknown';
    }

    for (const flowId of flowIds) {
      evidence.push({
        source:
          'test',

        evidenceId:
          test.id,

        flowId,

        scenarioIds:
          test.flowScenarioIds ??
          [],

        status,

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


function flowBlocksRelease(
  flow:
    CriticalFlowCoverage
): boolean {
  if (
    flow.critical &&
    flow.status !==
      'pass'
  ) {
    return true;
  }

  return flow.scenarios.some(
    scenario =>
      scenario.critical &&
      scenario.status !==
        'pass'
  );
}


const FLOW_RISK_ORDER:
  Record<
    RiskLevel,
    number
  > = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };


function elevatedFlowRisk(
  current:
    RiskLevel,

  required:
    RiskLevel
): RiskLevel {
  return (
    FLOW_RISK_ORDER[required] >
    FLOW_RISK_ORDER[current]
      ? required
      : current
  );
}


export function applyCriticalFlowReleaseGate(
  assessment:
    ReleaseAssessment,

  coverage:
    CriticalFlowCoverage[]
): ReleaseAssessment {
  const blockingFlows =
    coverage.filter(
      flowBlocksRelease
    ).length;

  const flowGaps =
    coverage.filter(
      flow =>
        flow.status !==
        'pass'
    ).length;

  const failedFlows =
    coverage.filter(
      flow =>
        !flowBlocksRelease(flow) &&
        flow.status ===
          'fail'
    ).length;

  const incompleteFlows =
    coverage.filter(
      flow =>
        !flowBlocksRelease(flow) &&
        (
          flow.status ===
            'degraded' ||
          flow.status ===
            'not-tested'
        )
    ).length;

  if (
    blockingFlows > 0
  ) {
    return {
      ...assessment,

      status:
        'not-ready',

      risk:
        elevatedFlowRisk(
          assessment.risk,
          'critical'
        ),

      blockingFlows,

      flowGaps,

      verdict:
        `${assessment.verdict} ${blockingFlows} critical flow${blockingFlows === 1 ? '' : 's'} are not fully verified.`,

      recommendedAction:
        `${assessment.recommendedAction} Resolve or fully verify all critical flow gaps before release.`,
    };
  }

  if (
    failedFlows > 0
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevatedFlowRisk(
          assessment.risk,
          'high'
        ),

      blockingFlows: 0,

      flowGaps,

      verdict:
        `${assessment.verdict} ${failedFlows} non-critical flow${failedFlows === 1 ? '' : 's'} currently fail verification.`,

      recommendedAction:
        `${assessment.recommendedAction} Review and resolve failing user journeys before release where possible.`,
    };
  }

  if (
    incompleteFlows > 0
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevatedFlowRisk(
          assessment.risk,
          'medium'
        ),

      blockingFlows: 0,

      flowGaps,

      verdict:
        `${assessment.verdict} ${incompleteFlows} flow${incompleteFlows === 1 ? '' : 's'} have incomplete scenario coverage.`,

      recommendedAction:
        `${assessment.recommendedAction} Complete missing Happy Path, Edge Case, Error Handling and Recovery coverage.`,
    };
  }

  return {
    ...assessment,

    blockingFlows: 0,

    flowGaps: 0,
  };
}
