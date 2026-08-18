/*
============================================================
QA SENTINEL UNIFIED SCORING & DECISIONING
Milestone 5.9
============================================================

Core rules:

- One correlated incident = one decision unit.
- One standalone issue = one decision unit.
- Evidence nodes inside an incident are NOT scored again.
- Quality gates remain semantic gates, not extra issue units.
- Existing priorityScore is reused when available.
- No fabricated quality-dimension weighting.
- No additive risk stacking for duplicate evidence.
============================================================
*/

import type {
  CrossLayerAssessment,
  CrossLayerIncident,
  CrossLayerRootCauseLayer,
  IntelligencePriority,
  IntelligenceSource,
  QualityDimension,
  Severity,
  UnifiedDecisionAssessment,
  UnifiedDecisionGateSummary,
  UnifiedDecisionUnit,
} from '../models/types';


type DecisionIssue = {
  source:
    IntelligenceSource;

  fingerprint:
    string;

  title:
    string;

  severity:
    Severity | string;

  classification?:
    string;

  priority?:
    IntelligencePriority | string;

  priorityScore?:
    number;

  score?:
    number;

  confidence?:
    number;

  diagnosisConfidence?:
    number;

  rootCause?:
    string;

  userImpact?:
    string;

  recommendation?:
    string;

  qualityDimensions?:
    QualityDimension[] | string[];

  requirementIds?:
    string[];

  criticalFlowIds?:
    string[];

  criticalFlows?:
    string[];

  flowScenarioIds?:
    string[];

  statusCode?:
    number;
};


export interface UnifiedDecisionGateInput {
  complete?:
    boolean;

  blockingRequirements?:
    number;

  requirementGaps?:
    number;

  blockingFlows?:
    number;

  flowGaps?:
    number;

  blockingUxAreas?:
    number;

  uxUiGaps?:
    number;

  blockingSecurityAreas?:
    number;

  blockingPerformanceAreas?:
    number;

  securityGaps?:
    number;

  performanceGaps?:
    number;

  blockingCompatibilityRegressions?:
    number;

  compatibilityGaps?:
    number;

  blockingApiIssues?:
    number;

  blockingBackendIssues?:
    number;

  apiIntelligenceGaps?:
    number;

  backendIntelligenceGaps?:
    number;
}


const QUALITY_DIMENSIONS:
  QualityDimension[] = [
    'requirements-functionality',
    'critical-flows',
    'ux-ui',
    'security-performance',
    'compatibility',
    'api-backend',
  ];


function uniqueStrings(
  values:
    Array<string | undefined>
): string[] {

  return [
    ...new Set(
      values.filter(
        (
          value
        ): value is string =>
          typeof value === 'string' &&
          value.trim().length > 0
      )
    ),
  ];
}


function uniqueSources(
  values:
    IntelligenceSource[]
): IntelligenceSource[] {

  return [
    ...new Set(values),
  ];
}


function uniqueDimensions(
  values:
    Array<string | QualityDimension>
): QualityDimension[] {

  return [
    ...new Set(
      values.filter(
        (
          value
        ): value is QualityDimension =>
          QUALITY_DIMENSIONS.includes(
            value as QualityDimension
          )
      )
    ),
  ];
}


function safeCount(
  value:
    number | undefined
): number {

  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
    ? Math.floor(value)
    : 0;
}


function normalizeSeverity(
  value:
    string
): Severity {

  const normalized =
    String(
      value ??
      ''
    ).toLowerCase();


  if (
    normalized === 'critical' ||
    normalized === 'high' ||
    normalized === 'medium' ||
    normalized === 'low' ||
    normalized === 'info' ||
    normalized === 'none'
  ) {
    return normalized as Severity;
  }


  return 'medium';
}


function severityRank(
  value:
    Severity
): number {

  switch (value) {
    case 'critical':
      return 5;

    case 'high':
      return 4;

    case 'medium':
      return 3;

    case 'low':
      return 2;

    case 'info':
      return 1;

    default:
      return 0;
  }
}


function normalizePriority(
  value:
    string | undefined,

  severity:
    Severity
): IntelligencePriority {

  const normalized =
    String(
      value ??
      ''
    ).toUpperCase();


  if (
    normalized === 'P0' ||
    normalized === 'P1' ||
    normalized === 'P2' ||
    normalized === 'P3' ||
    normalized === 'P4'
  ) {
    return normalized as IntelligencePriority;
  }


  switch (severity) {
    case 'critical':
      return 'P0';

    case 'high':
      return 'P1';

    case 'medium':
      return 'P2';

    case 'low':
      return 'P3';

    default:
      return 'P4';
  }
}


function priorityRank(
  value:
    IntelligencePriority
): number {

  switch (value) {
    case 'P0':
      return 5;

    case 'P1':
      return 4;

    case 'P2':
      return 3;

    case 'P3':
      return 2;

    case 'P4':
    default:
      return 1;
  }
}


function existingPriorityScale(
  value:
    IntelligencePriority
): number {

  /*
   * Same fallback scale already used by
   * Sentinel API/Backend Intelligence.
   */
  switch (value) {
    case 'P0':
      return 100;

    case 'P1':
      return 80;

    case 'P2':
      return 60;

    case 'P3':
      return 40;

    case 'P4':
    default:
      return 20;
  }
}


function issuePriority(
  issue:
    DecisionIssue
): IntelligencePriority {

  const severity =
    normalizeSeverity(
      String(
        issue.severity
      )
    );


  return normalizePriority(
    issue.priority,
    severity
  );
}


function issuePriorityScore(
  issue:
    DecisionIssue
): number {

  const value =
    issue.priorityScore ??
    issue.score;


  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(value)
      )
    );
  }


  return existingPriorityScale(
    issuePriority(issue)
  );
}


function issueConfidence(
  issue:
    DecisionIssue
): number | null {

  const value =
    issue.diagnosisConfidence ??
    issue.confidence;


  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null;
  }


  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}


function normalizedClassification(
  issue:
    DecisionIssue
): string {

  return String(
    issue.classification ??
    ''
  )
    .trim()
    .toLowerCase();
}


function issueEvidenceState(
  issue:
    DecisionIssue
): UnifiedDecisionUnit['evidenceState'] {

  const classification =
    normalizedClassification(
      issue
    );


  if (
    classification ===
      'automation-issue'
  ) {
    return 'automation';
  }


  if (
    classification ===
      'needs-investigation' ||
    classification ===
      'warning' ||
    classification ===
      'none'
  ) {
    return 'uncertain';
  }


  if (
    issue.source !==
      'test'
  ) {
    return 'confirmed';
  }


  if (
    classification.length === 0
  ) {
    return 'uncertain';
  }


  return 'confirmed';
}


function issueRiskEligible(
  issue:
    DecisionIssue
): boolean {

  return (
    issueEvidenceState(
      issue
    ) ===
      'confirmed'
  );
}


function issueIsBlocking(
  issue:
    DecisionIssue
): boolean {

  const severity =
    normalizeSeverity(
      String(
        issue.severity
      )
    );


  const priority =
    issuePriority(
      issue
    );


  if (
    issue.source ===
      'test'
  ) {
    const classification =
      normalizedClassification(
        issue
      );


    if (
      classification ===
        'automation-issue' ||
      classification ===
        'needs-investigation' ||
      classification ===
        'warning' ||
      classification.length === 0
    ) {
      return false;
    }


    if (
      classification ===
        'product-bug' ||
      classification ===
        'security-issue'
    ) {
      return (
        priority === 'P0' ||
        priority === 'P1' ||
        severity === 'critical' ||
        severity === 'high'
      );
    }


    return false;
  }


  if (
    issue.source ===
      'discovery'
  ) {
    return (
      priority ===
        'P0'
    );
  }


  if (
    issue.source ===
      'api' ||
    issue.source ===
      'backend'
  ) {
    return (
      priority === 'P0' ||
      severity === 'critical' ||
      (
        typeof issue.statusCode ===
          'number' &&
        issue.statusCode >= 500 &&
        issue.statusCode <= 599
      )
    );
  }


  return false;
}


function gateSummaryFrom(
  input:
    UnifiedDecisionGateInput | undefined
): UnifiedDecisionGateSummary {

  return {
    complete:
      input?.complete === true,

    blockingRequirements:
      safeCount(
        input?.blockingRequirements
      ),

    requirementGaps:
      safeCount(
        input?.requirementGaps
      ),

    blockingFlows:
      safeCount(
        input?.blockingFlows
      ),

    flowGaps:
      safeCount(
        input?.flowGaps
      ),

    blockingUxAreas:
      safeCount(
        input?.blockingUxAreas
      ),

    uxUiGaps:
      safeCount(
        input?.uxUiGaps
      ),

    blockingSecurityAreas:
      safeCount(
        input?.blockingSecurityAreas
      ),

    blockingPerformanceAreas:
      safeCount(
        input?.blockingPerformanceAreas
      ),

    securityGaps:
      safeCount(
        input?.securityGaps
      ),

    performanceGaps:
      safeCount(
        input?.performanceGaps
      ),

    blockingCompatibilityRegressions:
      safeCount(
        input?.blockingCompatibilityRegressions
      ),

    compatibilityGaps:
      safeCount(
        input?.compatibilityGaps
      ),

    blockingApiIssues:
      safeCount(
        input?.blockingApiIssues
      ),

    blockingBackendIssues:
      safeCount(
        input?.blockingBackendIssues
      ),

    apiIntelligenceGaps:
      safeCount(
        input?.apiIntelligenceGaps
      ),

    backendIntelligenceGaps:
      safeCount(
        input?.backendIntelligenceGaps
      ),
  };
}


function blockingGateDimensions(
  gates:
    UnifiedDecisionGateSummary
): string[] {

  const dimensions:
    string[] = [];


  if (
    gates.blockingRequirements > 0
  ) {
    dimensions.push(
      'requirements-functionality'
    );
  }


  if (
    gates.blockingFlows > 0
  ) {
    dimensions.push(
      'critical-flows'
    );
  }


  if (
    gates.blockingUxAreas > 0
  ) {
    dimensions.push(
      'ux-ui'
    );
  }


  if (
    gates.blockingSecurityAreas > 0
  ) {
    dimensions.push(
      'security'
    );
  }


  if (
    gates.blockingPerformanceAreas > 0
  ) {
    dimensions.push(
      'performance'
    );
  }


  if (
    gates.blockingCompatibilityRegressions > 0
  ) {
    dimensions.push(
      'compatibility'
    );
  }


  if (
    gates.blockingApiIssues > 0 ||
    gates.blockingBackendIssues > 0
  ) {
    dimensions.push(
      'api-backend'
    );
  }


  return [
    ...new Set(
      dimensions
    ),
  ];
}


function verificationGapDimensions(
  gates:
    UnifiedDecisionGateSummary
): string[] {

  const dimensions:
    string[] = [];


  if (
    gates.requirementGaps > 0
  ) {
    dimensions.push(
      'requirements-functionality'
    );
  }


  if (
    gates.flowGaps > 0
  ) {
    dimensions.push(
      'critical-flows'
    );
  }


  if (
    gates.uxUiGaps > 0
  ) {
    dimensions.push(
      'ux-ui'
    );
  }


  if (
    gates.securityGaps > 0
  ) {
    dimensions.push(
      'security'
    );
  }


  if (
    gates.performanceGaps > 0
  ) {
    dimensions.push(
      'performance'
    );
  }


  if (
    gates.compatibilityGaps > 0
  ) {
    dimensions.push(
      'compatibility'
    );
  }


  if (
    gates.apiIntelligenceGaps > 0 ||
    gates.backendIntelligenceGaps > 0
  ) {
    dimensions.push(
      'api-backend'
    );
  }


  return [
    ...new Set(
      dimensions
    ),
  ];
}


function issueUnit(
  issue:
    DecisionIssue
): UnifiedDecisionUnit {

  const severity =
    normalizeSeverity(
      String(
        issue.severity
      )
    );


  const priority =
    normalizePriority(
      issue.priority,
      severity
    );


  const blocking =
    issueIsBlocking(
      issue
    );


  const evidenceState =
    issueEvidenceState(
      issue
    );


  const riskEligible =
    issueRiskEligible(
      issue
    );


  return {
    id:
      `issue:${issue.fingerprint}`,

    kind:
      'standalone-issue',

    disposition:
      blocking
        ? 'block'
        : 'warn',

    sources:
      [
        issue.source,
      ],

    issueFingerprints:
      [
        issue.fingerprint,
      ],

    priority,

    priorityScore:
      issuePriorityScore(
        issue
      ),

    severity,

    blocking,

    evidenceState,

    riskEligible,

    confidence:
      issueConfidence(
        issue
      ),

    rootCause:
      issue.rootCause,

    userImpact:
      issue.userImpact,

    recommendation:
      issue.recommendation,

    qualityDimensions:
      uniqueDimensions(
        issue.qualityDimensions ??
        []
      ),

    requirementIds:
      issue.requirementIds ??
      [],

    criticalFlowIds:
      uniqueStrings([
        ...(
          issue.criticalFlowIds ??
          []
        ),

        ...(
          issue.criticalFlows ??
          []
        ),
      ]),

    flowScenarioIds:
      issue.flowScenarioIds ??
      [],
  };
}


function incidentUnit(
  incident:
    CrossLayerIncident,

  issueMap:
    Map<string, DecisionIssue>
): UnifiedDecisionUnit {

  const memberIssues =
    incident.issueFingerprints
      .map(
        fingerprint =>
          issueMap.get(
            fingerprint
          )
      )
      .filter(
        (
          issue
        ): issue is DecisionIssue =>
          Boolean(issue)
      );


  const riskMemberIssues =
    memberIssues.filter(
      issueRiskEligible
    );


  const scores =
    riskMemberIssues.map(
      issuePriorityScore
    );


  const priorityScore =
    scores.length > 0
      ? Math.max(
          ...scores
        )
      : existingPriorityScale(
          incident.priority
        );


  const decisionPriority =
    riskMemberIssues.length > 0
      ? riskMemberIssues
          .map(
            issuePriority
          )
          .sort(
            (
              a,
              b
            ) =>
              priorityRank(b) -
              priorityRank(a)
          )[0]
      : incident.priority;


  const decisionSeverity =
    riskMemberIssues.length > 0
      ? riskMemberIssues
          .map(
            issue =>
              normalizeSeverity(
                String(
                  issue.severity
                )
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              severityRank(b) -
              severityRank(a)
          )[0]
      : incident.severity;


  const riskEligible =
    riskMemberIssues.length >
      0;


  const evidenceStates =
    memberIssues.map(
      issueEvidenceState
    );


  const evidenceState:
    UnifiedDecisionUnit['evidenceState'] =
      evidenceStates.includes(
        'confirmed'
      )
        ? 'confirmed'
        : evidenceStates.includes(
            'uncertain'
          )
          ? 'uncertain'
          : 'automation';


  const qualityDimensions =
    uniqueDimensions(
      memberIssues.flatMap(
        issue =>
          issue.qualityDimensions ??
          []
      )
    );


  return {
    id:
      incident.id,

    kind:
      'cross-layer-incident',

    disposition:
      incident.blocking
        ? 'block'
        : 'warn',

    sources:
      uniqueSources(
        incident.sources
      ),

    issueFingerprints:
      [
        ...incident.issueFingerprints,
      ],

    priority:
      decisionPriority,

    priorityScore,

    severity:
      decisionSeverity,

    blocking:
      incident.blocking,

    evidenceState,

    riskEligible,

    confidence:
      typeof incident.confidence ===
        'number'
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                incident.confidence
              )
            )
          )
        : null,

    rootCauseLayer:
      incident.rootCauseLayer,

    rootCause:
      incident.rootCause,

    userImpact:
      incident.userImpact,

    recommendation:
      incident.recommendation,

    qualityDimensions,

    requirementIds:
      incident.requirementIds,

    criticalFlowIds:
      incident.criticalFlowIds,

    flowScenarioIds:
      incident.flowScenarioIds,
  };
}


function highestPriority(
  units:
    UnifiedDecisionUnit[]
): IntelligencePriority | null {

  if (
    units.length === 0
  ) {
    return null;
  }


  return [
    ...units,
  ]
    .map(
      unit =>
        unit.priority
    )
    .sort(
      (
        a,
        b
      ) =>
        priorityRank(b) -
        priorityRank(a)
    )[0] ??
    null;
}


function highestSeverity(
  units:
    UnifiedDecisionUnit[]
): Severity | null {

  if (
    units.length === 0
  ) {
    return null;
  }


  return [
    ...units,
  ]
    .map(
      unit =>
        unit.severity
    )
    .sort(
      (
        a,
        b
      ) =>
        severityRank(b) -
        severityRank(a)
    )[0] ??
    null;
}


function evidenceConfidence(
  units:
    UnifiedDecisionUnit[]
): number | null {

  const values =
    units
      .map(
        unit =>
          unit.confidence
      )
      .filter(
        (
          value
        ): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value)
      );


  if (
    values.length === 0
  ) {
    return null;
  }


  /*
   * Equal treatment of decision units.
   * No quality-dimension weighting.
   */
  return Math.round(
    values.reduce(
      (
        total,
        value
      ) =>
        total + value,

      0
    ) /
    values.length
  );
}


export function analyzeUnifiedDecisioning(
  issues:
    DecisionIssue[],

  crossLayer:
    CrossLayerAssessment,

  gateInput?:
    UnifiedDecisionGateInput
): UnifiedDecisionAssessment {

  const issueMap =
    new Map<
      string,
      DecisionIssue
    >();


  for (
    const issue
    of issues
  ) {
    issueMap.set(
      issue.fingerprint,
      issue
    );
  }


  const incidentUnits =
    crossLayer.incidents.map(
      incident =>
        incidentUnit(
          incident,
          issueMap
        )
    );


  const correlatedFingerprints =
    new Set(
      crossLayer.incidents.flatMap(
        incident =>
          incident.issueFingerprints
      )
    );


  const standaloneFingerprints =
    crossLayer
      .standaloneIssueFingerprints
      .filter(
        fingerprint =>
          !correlatedFingerprints.has(
            fingerprint
          )
      );


  const standaloneUnits:
    UnifiedDecisionUnit[] =
      [];


  const unresolvedStandaloneFingerprints:
    string[] =
      [];


  for (
    const fingerprint
    of standaloneFingerprints
  ) {
    const issue =
      issueMap.get(
        fingerprint
      );


    if (!issue) {
      unresolvedStandaloneFingerprints.push(
        fingerprint
      );

      continue;
    }


    standaloneUnits.push(
      issueUnit(
        issue
      )
    );
  }


  const decisionUnits = [
    ...incidentUnits,
    ...standaloneUnits,
  ];


  const blockers =
    decisionUnits.filter(
      unit =>
        unit.blocking
    );


  const warnings =
    decisionUnits.filter(
      unit =>
        !unit.blocking
    );


  const gates =
    gateSummaryFrom(
      gateInput
    );


  const blockedGateDimensions =
    blockingGateDimensions(
      gates
    );


  const gapDimensions =
    verificationGapDimensions(
      gates
    );


  /*
   * Risk is NOT additive.
   *
   * The most severe decision unit defines the
   * evidence risk level. Duplicate evidence inside
   * a correlated incident has already collapsed
   * to one unit.
   */
  const riskEligibleUnits =
    decisionUnits.filter(
      unit =>
        unit.riskEligible
    );


  const unitRiskScore =
    riskEligibleUnits.length > 0
      ? Math.max(
          ...riskEligibleUnits.map(
            unit =>
              unit.priorityScore
          )
        )
      : null;


  let scoreBasis:
    UnifiedDecisionAssessment['scoreBasis'];


  let riskScore:
    number | null;


  const materialRiskUnits =
    riskEligibleUnits.filter(
      unit =>
        unit.priority === 'P0' ||
        unit.priority === 'P1' ||
        unit.severity === 'critical' ||
        unit.severity === 'high'
    );


  const materialRiskScore =
    materialRiskUnits.length > 0
      ? Math.max(
          ...materialRiskUnits.map(
            unit =>
              unit.priorityScore
          )
        )
      : null;


  if (
    !gates.complete
  ) {
    scoreBasis =
      'not-verified';

    riskScore =
      null;
  }

  else if (
    blockedGateDimensions.length > 0
  ) {
    /*
     * A semantic release blocker is maximum risk,
     * but it is NOT added as another issue unit.
     */
    scoreBasis =
      'blocking-gate';

    riskScore =
      100;
  }

  else if (
    materialRiskScore !== null
  ) {
    scoreBasis =
      'decision-units';

    riskScore =
      materialRiskScore;
  }

  else if (
    gapDimensions.length > 0
  ) {
    /*
     * Verification gaps have no fabricated numeric
     * weight. State can warn, but score stays unknown.
     */
    scoreBasis =
      'verification-gaps';

    riskScore =
      null;
  }

  else if (
    unitRiskScore !== null
  ) {
    scoreBasis =
      'decision-units';

    riskScore =
      unitRiskScore;
  }

  else {
    /*
     * All decisioning inputs executed,
     * no verification gaps remain,
     * and no decision units exist.
     */
    scoreBasis =
      'verified-clean';

    riskScore =
      0;
  }


  const qualityScore =
    riskScore === null
      ? null
      : Math.max(
          0,
          100 - riskScore
        );


  let state:
    UnifiedDecisionAssessment['state'];


  if (
    !gates.complete
  ) {
    state =
      'not-verified';
  }

  else if (
    blockers.length > 0 ||
    blockedGateDimensions.length > 0
  ) {
    state =
      'not-ready';
  }

  else if (
    warnings.length > 0 ||
    gapDimensions.length > 0
  ) {
    state =
      'ready-with-warnings';
  }

  else {
    state =
      'ready';
  }


  /*
   * Correlation savings:
   *
   * 3 raw evidence nodes
   * collapsed into 1 incident
   * = 2 duplicate decision units removed.
   */
  const correlationSavings =
    Math.max(
      0,
      crossLayer.correlatedIssueCount -
      crossLayer.incidentCount
    );


  return {
    state,

    scoreBasis,

    rawIssueCount:
      issues.length,

    decisionUnitCount:
      decisionUnits.length,

    incidentUnits:
      incidentUnits.length,

    standaloneUnits:
      standaloneUnits.length,

    blockingUnits:
      blockers.length,

    warningUnits:
      warnings.length,

    correlatedEvidenceCount:
      crossLayer.correlatedIssueCount,

    correlationSavings,

    unresolvedStandaloneFingerprints,

    riskScore,

    qualityScore,

    confidence:
      gapDimensions.length > 0
        ? Math.min(
            evidenceConfidence(
              decisionUnits
            ) ?? 70,
            72
          )
        : evidenceConfidence(
            decisionUnits
          ),

    highestPriority:
      highestPriority(
        riskEligibleUnits
      ),

    highestSeverity:
      highestSeverity(
        riskEligibleUnits
      ),

    gateSummary:
      gates,

    blockingGateDimensions:
      blockedGateDimensions,

    verificationGapDimensions:
      gapDimensions,

    decisionUnits,
  };
}
