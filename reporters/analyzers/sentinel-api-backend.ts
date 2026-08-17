import type {
  ApiBackendAssessment,
  ApiBackendEvidence,
  ApiBackendStatus,
  ApiIntelligenceAssessment,
  ApiIntelligenceIssue,
  BackendIntelligenceAssessment,
  BackendIntelligenceIssue,
  IntelligencePriority,
  IntelligenceSource,
  IssueClassification,
  QualityDimension,
  Severity,
  ReleaseAssessment,
  RiskLevel,
} from '../models/types';


type PromotableIssue = {
  source:
    IntelligenceSource;

  fingerprint:
    string;

  title:
    string;

  site:
    string;

  category:
    string;

  severity:
    Severity | string;

  classification?:
    IssueClassification | string;

  description?:
    string;

  evidence?:
    string;

  rootCause?:
    string;

  userImpact?:
    string;

  recommendation?:
    string;

  confidence?:
    number;

  diagnosisConfidence?:
    number;

  priority?:
    IntelligencePriority | string;

  priorityScore?:
    number;

  score?:
    number;

  occurrences?:
    number;

  qualityDimensions?:
    QualityDimension[] | string[];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];

  criticalFlowIds?:
    string[];

  criticalFlows?:
    string[];

  flowScenarioIds?:
    string[];

  route?:
    string;

  affectedRoutes?:
    string[];
};


export interface ApiBackendPromotionResult {
  apiIssues:
    ApiIntelligenceIssue[];

  backendIssues:
    BackendIntelligenceIssue[];

  assessment:
    ApiBackendAssessment;
}


function uniqueStrings(
  values:
    string[]
): string[] {

  return [
    ...new Set(
      values.filter(Boolean)
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


function normalizeSeverity(
  severity:
    string
): Severity {

  const value =
    String(
      severity ??
      ''
    ).toLowerCase();


  if (
    value === 'critical' ||
    value === 'high' ||
    value === 'medium' ||
    value === 'low' ||
    value === 'info' ||
    value === 'none'
  ) {
    return value as Severity;
  }


  return 'medium';
}


function signalText(
  signal:
    PromotableIssue
): string {

  return [
    signal.title,
    signal.category,
    signal.description,
    signal.evidence,
    signal.rootCause,
    signal.userImpact,
    signal.recommendation,
    signal.route,

    ...(
      signal.affectedRoutes ??
      []
    ),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}


function uncertainClassification(
  signal:
    PromotableIssue
): boolean {

  if (
    signal.source !== 'test'
  ) {
    return false;
  }


  const value =
    String(
      signal.classification ??
      ''
    ).toLowerCase();


  return (
    value === 'automation-issue' ||
    value === 'needs-investigation' ||
    value === 'warning'
  );
}


function isThirdParty(
  signal:
    PromotableIssue
): boolean {

  const text =
    signalText(signal);


  return (
    text.includes('third-party') ||
    text.includes('third party') ||
    text.includes('external dependency') ||
    text.includes('external service')
  );
}


function hasApiBackendDimension(
  signal:
    PromotableIssue
): boolean {

  return (
    signal.qualityDimensions ??
    []
  ).includes(
    'api-backend'
  );
}


function statusCodeFromSignal(
  signal:
    PromotableIssue
): number | undefined {

  const match =
    signalText(signal).match(
      /\b([45][0-9][0-9])\b/
    );


  if (!match) {
    return undefined;
  }


  const code =
    Number(match[1]);


  return Number.isFinite(code)
    ? code
    : undefined;
}


function endpointFromSignal(
  signal:
    PromotableIssue
): string | undefined {

  const text =
    [
      signal.evidence,
      signal.description,
      signal.title,
      signal.rootCause,
    ]
      .filter(Boolean)
      .join(' ');


  const absolute =
    text.match(
      /https?:\/\/[^\s"'<>]+/i
    );


  if (absolute) {
    return absolute[0]
      .replace(
        /[),.;]+$/,
        ''
      );
  }


  const apiPath =
    text.match(
      /\/(?:api|graphql|rest|v[0-9]+)\/[A-Za-z0-9_?&=./:%+-]+/i
    );


  return apiPath?.[0]
    ?.replace(
      /[),.;]+$/,
      ''
    );
}


function methodFromSignal(
  signal:
    PromotableIssue
): string | undefined {

  const match =
    signalText(signal).match(
      /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i
    );


  return match?.[1]
    ?.toUpperCase();
}


function serviceFromEndpoint(
  endpoint:
    string | undefined
): string | undefined {

  if (!endpoint) {
    return undefined;
  }


  const match =
    endpoint.match(
      /^https?:\/\/([^/:?#]+)/i
    );


  return match?.[1];
}


function priorityForSignal(
  signal:
    PromotableIssue
): IntelligencePriority {

  const existing =
    String(
      signal.priority ??
      ''
    ).toUpperCase();


  if (
    existing === 'P0' ||
    existing === 'P1' ||
    existing === 'P2' ||
    existing === 'P3' ||
    existing === 'P4'
  ) {
    return existing as IntelligencePriority;
  }


  switch (
    normalizeSeverity(
      String(
        signal.severity
      )
    )
  ) {
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


function defaultPriorityScore(
  priority:
    IntelligencePriority
): number {

  switch (priority) {
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


function signalPriorityScore(
  signal:
    PromotableIssue,

  priority:
    IntelligencePriority
): number {

  const candidate =
    signal.priorityScore ??
    signal.score;


  return (
    typeof candidate === 'number' &&
    Number.isFinite(candidate)
  )
    ? candidate
    : defaultPriorityScore(priority);
}


function strongApiSignal(
  signal:
    PromotableIssue
): boolean {

  if (
    uncertainClassification(signal) ||
    isThirdParty(signal)
  ) {
    return false;
  }


  if (
    signal.source === 'api'
  ) {
    return true;
  }


  const category =
    String(
      signal.category ??
      ''
    ).toLowerCase();


  const text =
    signalText(signal);


  if (
    category === 'api'
  ) {
    return true;
  }


  if (
    text.includes('first-party api') ||
    text.includes('first party api') ||
    text.includes('api failure') ||
    text.includes('api endpoint') ||
    text.includes('first-party request failed')
  ) {
    return true;
  }


  return (
    hasApiBackendDimension(signal) &&
    (
      category === 'http' ||
      category === 'network'
    ) &&
    (
      text.includes('first-party') ||
      text.includes('first party') ||
      text.includes('endpoint')
    )
  );
}


function strongBackendSignal(
  signal:
    PromotableIssue
): boolean {

  if (
    uncertainClassification(signal) ||
    isThirdParty(signal)
  ) {
    return false;
  }


  if (
    signal.source === 'backend'
  ) {
    return true;
  }


  const text =
    signalText(signal);


  const statusCode =
    statusCodeFromSignal(signal);


  const serverError =
    typeof statusCode === 'number' &&
    statusCode >= 500 &&
    statusCode <= 599;


  if (
    serverError &&
    strongApiSignal(signal)
  ) {
    return true;
  }


  return (
    text.includes('backend failure') ||
    text.includes('first-party backend') ||
    text.includes('first party backend') ||
    (
      (
        text.includes('backend') ||
        text.includes('infrastructure') ||
        text.includes('upstream dependency')
      ) &&
      (
        text.includes('first-party') ||
        text.includes('first party') ||
        strongApiSignal(signal)
      )
    )
  );
}


function timeoutSignal(
  signal:
    PromotableIssue
): boolean {

  const text =
    signalText(signal);


  return (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('err_timed_out')
  );
}


function infrastructureSignal(
  signal:
    PromotableIssue
): boolean {

  const text =
    signalText(signal);


  return (
    text.includes('infrastructure') ||
    text.includes('load balancer') ||
    text.includes('proxy') ||
    text.includes('connection refused')
  );
}


function dependencySignal(
  signal:
    PromotableIssue
): boolean {

  if (
    isThirdParty(signal)
  ) {
    return false;
  }


  const text =
    signalText(signal);


  return (
    text.includes('upstream dependency') ||
    text.includes('backend dependency')
  );
}


function signalConfidence(
  signal:
    PromotableIssue
): number {

  const candidate =
    signal.diagnosisConfidence ??
    signal.confidence;


  if (
    typeof candidate === 'number' &&
    Number.isFinite(candidate)
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(candidate)
      )
    );
  }


  return 70;
}


function promoteApi(
  signal:
    PromotableIssue
): ApiIntelligenceIssue {

  const priority =
    priorityForSignal(signal);


  const endpoint =
    endpointFromSignal(signal);


  return {
    source:
      'api',

    originSource:
      signal.source,

    originFingerprint:
      signal.fingerprint,

    fingerprint:
      `api:${signal.fingerprint}`,

    title:
      signal.title,

    site:
      signal.site,

    category:
      'api',

    severity:
      normalizeSeverity(
        String(signal.severity)
      ),

    classification:
      signal.classification,

    qualityDimensions:
      ['api-backend'],

    priority,

    priorityScore:
      signalPriorityScore(
        signal,
        priority
      ),

    endpoint:
      endpoint ??
      'Unresolved endpoint',

    endpointResolved:
      Boolean(endpoint),

    statusCode:
      statusCodeFromSignal(signal),

    method:
      methodFromSignal(signal),

    occurrences:
      signal.occurrences ??
      1,

    requirementIds:
      signal.requirementIds ??
      [],

    acceptanceCriteriaIds:
      signal.acceptanceCriteriaIds ??
      [],

    criticalFlowIds:
      signal.criticalFlowIds ??
      signal.criticalFlows ??
      [],

    flowScenarioIds:
      signal.flowScenarioIds ??
      [],

    evidence:
      signal.evidence ??
      signal.description ??
      signal.rootCause ??
      signal.title,

    rootCause:
      signal.rootCause ??
      'A first-party API signal was detected but the exact endpoint cause remains unresolved.',

    userImpact:
      signal.userImpact ??
      'Functionality depending on the affected API request may be degraded.',

    recommendation:
      signal.recommendation ??
      'Inspect the affected first-party API request and verify the expected endpoint behaviour.',

    confidence:
      signalConfidence(signal),
  } as unknown as ApiIntelligenceIssue;
}


function promoteBackend(
  signal:
    PromotableIssue
): BackendIntelligenceIssue {

  const priority =
    priorityForSignal(signal);


  const endpoint =
    endpointFromSignal(signal);


  const service =
    serviceFromEndpoint(endpoint);


  return {
    source:
      'backend',

    originSource:
      signal.source,

    originFingerprint:
      signal.fingerprint,

    fingerprint:
      `backend:${signal.fingerprint}`,

    title:
      signal.title,

    site:
      signal.site,

    category:
      'api',

    severity:
      normalizeSeverity(
        String(signal.severity)
      ),

    classification:
      signal.classification,

    qualityDimensions:
      ['api-backend'],

    priority,

    priorityScore:
      signalPriorityScore(
        signal,
        priority
      ),

    service:
      service ??
      'Unresolved first-party service',

    serviceResolved:
      Boolean(service),

    statusCode:
      statusCodeFromSignal(signal),

    infrastructureSignal:
      infrastructureSignal(signal),

    dependency:
      dependencySignal(signal)
        ? 'First-party/upstream dependency'
        : undefined,

    occurrences:
      signal.occurrences ??
      1,

    requirementIds:
      signal.requirementIds ??
      [],

    acceptanceCriteriaIds:
      signal.acceptanceCriteriaIds ??
      [],

    criticalFlowIds:
      signal.criticalFlowIds ??
      signal.criticalFlows ??
      [],

    flowScenarioIds:
      signal.flowScenarioIds ??
      [],

    evidence:
      signal.evidence ??
      signal.description ??
      signal.rootCause ??
      signal.title,

    rootCause:
      signal.rootCause ??
      'The evidence indicates a likely first-party backend, infrastructure or dependency failure.',

    userImpact:
      signal.userImpact ??
      'Backend-dependent application functionality may be unavailable or degraded.',

    recommendation:
      signal.recommendation ??
      'Inspect backend, infrastructure and dependency logs for the corresponding first-party request.',

    confidence:
      signalConfidence(signal),
  } as unknown as BackendIntelligenceIssue;
}


function statusFromIssues(
  issues:
    Array<{
      priority:
        IntelligencePriority;

      severity:
        Severity;
    }>,
  positiveEvidenceCount:
    number
): ApiBackendStatus {

  if (
    issues.length === 0
  ) {
    /*
     * Zero findings is healthy only when
     * successful first-party evidence exists.
     * Zero findings plus zero evidence remains
     * explicitly NOT VERIFIED.
     */
    return positiveEvidenceCount > 0
      ? 'healthy'
      : 'not-verified';
  }


  if (
    issues.some(
      issue =>
        issue.priority === 'P0' ||
        issue.severity === 'critical'
    )
  ) {
    return 'critical';
  }


  if (
    issues.some(
      issue =>
        issue.priority === 'P1' ||
        issue.severity === 'high'
    )
  ) {
    return 'poor';
  }


  return 'degraded';
}


function buildApiAssessment(
  issues:
    ApiIntelligenceIssue[],
  evidence:
    ApiBackendEvidence[]
): ApiIntelligenceAssessment {

  const codes =
    issues
      .map(
        issue =>
          issue.statusCode
      )
      .filter(
        (
          value
        ): value is number =>
          typeof value === 'number'
      );


  /*
   * v3:
   * Explicitly narrow optional endpoint
   * to string before uniqueStrings().
   */
  const endpoints =
    uniqueStrings([
      ...issues
        .filter(
          issue =>
            issue.endpointResolved
        )
        .map(
          issue =>
            issue.endpoint
        )
        .filter(
          (
            value
          ): value is string =>
            typeof value === 'string' &&
            value.length > 0
        ),
      ...evidence.map(
        item =>
          item.url
      ),
    ]);


  return {
    status:
      statusFromIssues(
        issues,
        evidence.length
      ),

    issueCount:
      issues.length,

    positiveEvidenceCount:
      evidence.length,

    blockingIssues:
      issues.filter(
        issue =>
          issue.priority === 'P0' ||
          issue.severity === 'critical'
      ).length,

    endpointCount:
      endpoints.length,

    unresolvedEndpointCount:
      issues.filter(
        issue =>
          !issue.endpointResolved
      ).length,

    serverErrors:
      codes.filter(
        code =>
          code >= 500 &&
          code <= 599
      ).length,

    authFailures:
      codes.filter(
        code =>
          code === 401 ||
          code === 403
      ).length,

    notFoundResponses:
      codes.filter(
        code =>
          code === 404
      ).length,

    timeouts:
      issues.filter(
        issue =>
          timeoutSignal(
            issue as unknown as
              PromotableIssue
          )
      ).length,

    affectedEndpoints:
      endpoints,

    sourceCoverage:
      issues.length ||
      evidence.length
        ? ['api']
        : [],

    originSources:
      uniqueSources([
        ...issues
          .map(
            issue =>
              issue.originSource
          )
          .filter(
            (
              source
            ): source is IntelligenceSource =>
              Boolean(source)
          ),
        ...evidence.map(
          item =>
            item.originSource
        ),
      ]),
  };
}


function buildBackendAssessment(
  issues:
    BackendIntelligenceIssue[],
  evidence:
    ApiBackendEvidence[]
): BackendIntelligenceAssessment {

  /*
   * v3:
   * Explicitly narrow optional service
   * to string before uniqueStrings().
   */
  const services =
    uniqueStrings([
      ...issues
        .filter(
          issue =>
            issue.serviceResolved
        )
        .map(
          issue =>
            issue.service
        )
        .filter(
          (
            value
          ): value is string =>
            typeof value === 'string' &&
            value.length > 0
        ),
      ...evidence
        .map(
          item =>
            item.service
        )
        .filter(
          (
            value
          ): value is string =>
            typeof value === 'string' &&
            value.length > 0
        ),
    ]);


  return {
    status:
      statusFromIssues(
        issues,
        evidence.length
      ),

    issueCount:
      issues.length,

    positiveEvidenceCount:
      evidence.length,

    blockingIssues:
      issues.filter(
        issue =>
          issue.priority === 'P0' ||
          issue.severity === 'critical'
      ).length,

    serviceCount:
      services.length,

    unresolvedServiceCount:
      issues.filter(
        issue =>
          !issue.serviceResolved
      ).length,

    serverErrors:
      issues.filter(
        issue =>
          typeof issue.statusCode === 'number' &&
          issue.statusCode >= 500 &&
          issue.statusCode <= 599
      ).length,

    timeouts:
      issues.filter(
        issue =>
          timeoutSignal(
            issue as unknown as
              PromotableIssue
          )
      ).length,

    dependencyFailures:
      issues.filter(
        issue =>
          Boolean(issue.dependency)
      ).length,

    infrastructureFailures:
      issues.filter(
        issue =>
          Boolean(
            issue.infrastructureSignal
          )
      ).length,

    affectedServices:
      services,

    sourceCoverage:
      issues.length ||
      evidence.length
        ? ['backend']
        : [],

    originSources:
      uniqueSources([
        ...issues
          .map(
            issue =>
              issue.originSource
          )
          .filter(
            (
              source
            ): source is IntelligenceSource =>
              Boolean(source)
          ),
        ...evidence.map(
          item =>
            item.originSource
        ),
      ]),
  };
}


function combinedStatus(
  api:
    ApiIntelligenceAssessment,

  backend:
    BackendIntelligenceAssessment
): ApiBackendStatus {

  if (
    api.status === 'critical' ||
    backend.status === 'critical'
  ) {
    return 'critical';
  }


  if (
    api.status === 'poor' ||
    backend.status === 'poor'
  ) {
    return 'poor';
  }


  if (
    api.status === 'degraded' ||
    backend.status === 'degraded'
  ) {
    return 'degraded';
  }


  if (
    api.status === 'healthy' &&
    backend.status === 'healthy'
  ) {
    return 'healthy';
  }


  return 'not-verified';
}


export function promoteApiBackendIntelligence(
  signals:
    PromotableIssue[],
  positiveEvidence:
    ApiBackendEvidence[] = []
): ApiBackendPromotionResult {

  const apiIssues:
    ApiIntelligenceIssue[] =
      [];


  const backendIssues:
    BackendIntelligenceIssue[] =
      [];


  for (const signal of signals) {

    if (
      strongApiSignal(signal)
    ) {
      apiIssues.push(
        promoteApi(signal)
      );
    }


    if (
      strongBackendSignal(signal)
    ) {
      backendIssues.push(
        promoteBackend(signal)
      );
    }
  }


  const apiEvidence =
    positiveEvidence.filter(
      evidence =>
        evidence.kind ===
          'api-endpoint'
    );


  const backendEvidence =
    positiveEvidence.filter(
      evidence =>
        evidence.kind ===
          'backend-service'
    );


  const api =
    buildApiAssessment(
      apiIssues,
      apiEvidence
    );


  const backend =
    buildBackendAssessment(
      backendIssues,
      backendEvidence
    );


  const sourceCoverage:
    IntelligenceSource[] =
      [];


  if (
    apiIssues.length ||
    apiEvidence.length
  ) {
    sourceCoverage.push('api');
  }


  if (
    backendIssues.length ||
    backendEvidence.length
  ) {
    sourceCoverage.push('backend');
  }


  const originSources =
    uniqueSources([
      ...api.originSources,
      ...backend.originSources,
    ]);


  return {
    apiIssues,
    backendIssues,

    assessment: {
      status:
        combinedStatus(
          api,
          backend
        ),

      api,
      backend,

      promotedApiIssues:
        apiIssues.length,

      promotedBackendIssues:
        backendIssues.length,

      positiveEvidence: [
        ...apiEvidence,
        ...backendEvidence,
      ],

      sourceCoverage,
      originSources,
    },
  };
}



const API_BACKEND_RISK_ORDER:
  Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };


function elevateApiBackendRisk(
  current:
    RiskLevel,

  required:
    RiskLevel
): RiskLevel {

  if (
    API_BACKEND_RISK_ORDER[required] >
    API_BACKEND_RISK_ORDER[current]
  ) {
    return required;
  }


  return current;
}


export function applyApiBackendReleaseGate(
  assessment:
    ReleaseAssessment,

  intelligence:
    ApiBackendAssessment,

  apiIssues:
    ApiIntelligenceIssue[],

  backendIssues:
    BackendIntelligenceIssue[]
): ReleaseAssessment {

  /*
   * Existing Sentinel diagnostics define
   * first-party HTTP 5xx as release-blocking.
   *
   * P0 / critical issues are also blockers.
   */
  const blockingApiIssues =
    apiIssues.filter(
      issue =>
        issue.priority === 'P0' ||
        issue.severity === 'critical' ||
        (
          typeof issue.statusCode === 'number' &&
          issue.statusCode >= 500 &&
          issue.statusCode <= 599
        )
    ).length;


  const blockingBackendIssues =
    backendIssues.filter(
      issue =>
        issue.priority === 'P0' ||
        issue.severity === 'critical' ||
        (
          typeof issue.statusCode === 'number' &&
          issue.statusCode >= 500 &&
          issue.statusCode <= 599
        )
    ).length;


  /*
   * A missing positive API/Backend verification
   * is a coverage gap, not proof of healthy state.
   */
  const apiIntelligenceGaps =
    intelligence.api.unresolvedEndpointCount +
    (
      intelligence.api.status ===
        'not-verified'
        ? 1
        : 0
    );


  const backendIntelligenceGaps =
    intelligence.backend.unresolvedServiceCount +
    (
      intelligence.backend.status ===
        'not-verified'
        ? 1
        : 0
    );


  if (
    blockingApiIssues > 0 ||
    blockingBackendIssues > 0
  ) {
    return {
      ...assessment,

      status:
        'not-ready',

      risk:
        elevateApiBackendRisk(
          assessment.risk,
          'critical'
        ),

      blockingApiIssues,
      blockingBackendIssues,

      apiIntelligenceGaps,
      backendIntelligenceGaps,

      verdict:
        assessment.verdict +
        ' A release-blocking first-party API or backend failure was detected.',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve blocking first-party API 5xx, backend or infrastructure failures before release.',
    };
  }


  if (
    intelligence.status === 'poor'
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateApiBackendRisk(
          assessment.risk,
          'high'
        ),

      blockingApiIssues: 0,
      blockingBackendIssues: 0,

      apiIntelligenceGaps,
      backendIntelligenceGaps,

      verdict:
        assessment.verdict +
        ' Significant API or backend degradation was detected.',

      recommendedAction:
        assessment.recommendedAction +
        ' Review high-priority first-party API and backend findings before release.',
    };
  }


  if (
    intelligence.status === 'degraded' ||
    intelligence.status === 'not-verified'
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateApiBackendRisk(
          assessment.risk,
          'medium'
        ),

      blockingApiIssues: 0,
      blockingBackendIssues: 0,

      apiIntelligenceGaps,
      backendIntelligenceGaps,

      verdict:
        assessment.verdict +
        ' API or backend verification is incomplete or degraded.',

      recommendedAction:
        assessment.recommendedAction +
        ' Complete API/backend verification and review unresolved endpoint or service evidence.',
    };
  }


  return {
    ...assessment,

    blockingApiIssues: 0,
    blockingBackendIssues: 0,

    apiIntelligenceGaps: 0,
    backendIntelligenceGaps: 0,
  };
}
