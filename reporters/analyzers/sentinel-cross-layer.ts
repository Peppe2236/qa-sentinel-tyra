/*
============================================================
QA SENTINEL CROSS-LAYER CORRELATION
Milestone 5.8
============================================================

Correlation strength order:

1. Origin fingerprint
2. Endpoint / service
3. Requirement
4. Critical flow
5. Route / site
6. Root-cause similarity

Text similarity alone MUST NEVER create an incident.
============================================================
*/

import crypto from 'node:crypto';

import type {
  CrossLayerAssessment,
  CrossLayerConfidenceBand,
  CrossLayerCorrelationReason,
  CrossLayerEvidenceNode,
  CrossLayerIncident,
  CrossLayerRootCauseLayer,
  IntelligencePriority,
  IntelligenceSource,
  IssueClassification,
  Severity,
} from '../models/types';


type CorrelatableIssue = {
  source:
    IntelligenceSource;

  fingerprint:
    string;

  originFingerprint?:
    string;

  title:
    string;

  site:
    string;

  category?:
    string;

  severity:
    Severity | string;

  classification?:
    IssueClassification | string;

  priority?:
    IntelligencePriority | string;

  priorityScore?:
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

  evidence?:
    string;

  endpoint?:
    string;

  service?:
    string;

  statusCode?:
    number;

  route?:
    string;

  affectedRoutes?:
    string[];

  requirementIds?:
    string[];

  criticalFlowIds?:
    string[];

  criticalFlows?:
    string[];

  flowScenarioIds?:
    string[];

  sourceTestIds?:
    string[];

  dependency?:
    string;

  infrastructureSignal?:
    boolean;
};


type PairCorrelation = {
  score:
    number;

  reasons:
    CrossLayerCorrelationReason[];

  correlates:
    boolean;
};


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


function uniqueNumbers(
  values:
    Array<number | undefined>
): number[] {

  return [
    ...new Set(
      values.filter(
        (
          value
        ): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value)
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


function priorityFor(
  issue:
    CorrelatableIssue
): IntelligencePriority {

  const existing =
    String(
      issue.priority ??
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
        issue.severity
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


function normalizeTarget(
  value:
    string | undefined
): string {

  return String(
    value ??
    ''
  )
    .trim()
    .toLowerCase()
    .replace(
      /[?#].*$/,
      ''
    )
    .replace(
      /\/+$/,
      ''
    );
}


function routesFor(
  issue:
    CorrelatableIssue
): string[] {

  return uniqueStrings([
    issue.route,

    ...(
      issue.affectedRoutes ??
      []
    ),
  ])
    .map(
      normalizeTarget
    )
    .filter(Boolean);
}


function intersect(
  a:
    string[],

  b:
    string[]
): string[] {

  const right =
    new Set(b);

  return a.filter(
    value =>
      right.has(value)
  );
}


function originFamily(
  issue:
    CorrelatableIssue
): string {

  /*
   * This intentionally groups:
   *
   * discovery fingerprint = abc
   * api originFingerprint = abc
   * backend originFingerprint = abc
   */
  return (
    issue.originFingerprint ??
    issue.fingerprint
  );
}


function textTokens(
  value:
    string
): Set<string> {

  const stopWords =
    new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'that',
      'this',
      'was',
      'were',
      'are',
      'but',
      'not',
      'into',
      'may',
      'can',
      'could',
      'likely',
      'issue',
      'failure',
      'failed',
      'error',
      'application',
      'affected',
    ]);


  const tokens =
    String(value ?? '')
      .toLowerCase()
      .replace(
        /[^a-z0-9/_-]+/g,
        ' '
      )
      .split(/\s+/)
      .filter(
        token =>
          token.length >= 4 &&
          !stopWords.has(token)
      );


  return new Set(tokens);
}


function rootCauseSimilarity(
  a:
    CorrelatableIssue,

  b:
    CorrelatableIssue
): number {

  const aTokens =
    textTokens(
      [
        a.title,
        a.rootCause,
        a.evidence,
      ]
        .filter(Boolean)
        .join(' ')
    );


  const bTokens =
    textTokens(
      [
        b.title,
        b.rootCause,
        b.evidence,
      ]
        .filter(Boolean)
        .join(' ')
    );


  if (
    aTokens.size === 0 ||
    bTokens.size === 0
  ) {
    return 0;
  }


  let common = 0;


  for (
    const token
    of aTokens
  ) {
    if (
      bTokens.has(token)
    ) {
      common += 1;
    }
  }


  const union =
    new Set([
      ...aTokens,
      ...bTokens,
    ]).size;


  if (union === 0) {
    return 0;
  }


  return common / union;
}


function pairCorrelation(
  a:
    CorrelatableIssue,

  b:
    CorrelatableIssue
): PairCorrelation {

  /*
   * Cross-layer means cross-source.
   * Two API issues are not automatically
   * one cross-layer incident.
   */
  if (
    a.source ===
      b.source
  ) {
    return {
      score: 0,
      reasons: [],
      correlates: false,
    };
  }


  let score = 0;

  const reasons:
    CrossLayerCorrelationReason[] =
      [];


  const sameOrigin =
    originFamily(a) ===
      originFamily(b);


  if (sameOrigin) {
    score += 100;

    reasons.push(
      'origin-fingerprint'
    );
  }


  const endpointA =
    normalizeTarget(
      a.endpoint
    );

  const endpointB =
    normalizeTarget(
      b.endpoint
    );


  const sameEndpoint =
    Boolean(
      endpointA &&
      endpointB &&
      endpointA === endpointB
    );


  if (sameEndpoint) {
    score += 90;

    reasons.push(
      'endpoint'
    );
  }


  const serviceA =
    normalizeTarget(
      a.service
    );

  const serviceB =
    normalizeTarget(
      b.service
    );


  const sameService =
    Boolean(
      serviceA &&
      serviceB &&
      serviceA === serviceB
    );


  if (sameService) {
    score += 90;

    reasons.push(
      'service'
    );
  }


  const sharedRequirements =
    intersect(
      a.requirementIds ??
      [],

      b.requirementIds ??
      []
    );


  const sameRequirement =
    sharedRequirements.length >
      0;


  if (sameRequirement) {
    score += 40;

    reasons.push(
      'requirement'
    );
  }


  const aFlows =
    uniqueStrings([
      ...(
        a.criticalFlowIds ??
        []
      ),

      ...(
        a.criticalFlows ??
        []
      ),
    ]);


  const bFlows =
    uniqueStrings([
      ...(
        b.criticalFlowIds ??
        []
      ),

      ...(
        b.criticalFlows ??
        []
      ),
    ]);


  const sharedFlows =
    intersect(
      aFlows,
      bFlows
    );


  const sameFlow =
    sharedFlows.length >
      0;


  if (sameFlow) {
    score += 45;

    reasons.push(
      'critical-flow'
    );
  }


  const sharedRoutes =
    intersect(
      routesFor(a),
      routesFor(b)
    );


  const sameRoute =
    sharedRoutes.length >
      0;


  if (sameRoute) {
    score += 30;

    reasons.push(
      'route'
    );
  }


  const siteA =
    normalizeTarget(
      a.site
    );

  const siteB =
    normalizeTarget(
      b.site
    );


  const sameSite =
    Boolean(
      siteA &&
      siteB &&
      siteA === siteB
    );


  if (sameSite) {
    score += 10;

    reasons.push(
      'site'
    );
  }


  const sameStatusCode =
    typeof a.statusCode ===
      'number' &&
    typeof b.statusCode ===
      'number' &&
    a.statusCode >= 400 &&
    b.statusCode >= 400 &&
    a.statusCode ===
      b.statusCode;


  if (sameStatusCode) {
    score += 5;

    reasons.push(
      'status-code'
    );
  }


  const similarity =
    rootCauseSimilarity(
      a,
      b
    );


  if (
    similarity >= 0.45
  ) {
    score += Math.round(
      Math.min(
        20,
        similarity * 20
      )
    );

    reasons.push(
      'root-cause-similarity'
    );
  }


  /*
   * A structural anchor is mandatory.
   *
   * Text similarity and site alone can
   * never create a cross-layer incident.
   */
  const structuralAnchor =
    sameOrigin ||
    sameEndpoint ||
    sameService ||
    (
      sameRequirement &&
      sameFlow
    ) ||
    (
      sameRoute &&
      (
        sameRequirement ||
        sameFlow
      )
    );


  return {
    score:
      Math.min(
        100,
        score
      ),

    reasons:
      [
        ...new Set(
          reasons
        ),
      ],

    correlates:
      structuralAnchor &&
      score >= 80,
  };
}


class UnionFind {

  private parent:
    number[];


  constructor(
    size:
      number
  ) {
    this.parent =
      Array.from(
        {
          length: size,
        },

        (
          _,
          index
        ) =>
          index
      );
  }


  find(
    value:
      number
  ): number {

    if (
      this.parent[value] !==
        value
    ) {
      this.parent[value] =
        this.find(
          this.parent[value]
        );
    }


    return this.parent[value];
  }


  union(
    a:
      number,

    b:
      number
  ): void {

    const rootA =
      this.find(a);

    const rootB =
      this.find(b);


    if (
      rootA !==
        rootB
    ) {
      this.parent[rootB] =
        rootA;
    }
  }
}


function confidenceForScore(
  value:
    number
): CrossLayerConfidenceBand {

  if (
    value >= 90
  ) {
    return 'high';
  }


  if (
    value >= 80
  ) {
    return 'medium';
  }


  return 'low';
}


function sourceDepth(
  issue:
    CorrelatableIssue
): number {

  const text =
    [
      issue.rootCause,
      issue.evidence,
      issue.dependency,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();


  if (
    issue.source ===
      'backend' &&
    (
      Boolean(
        issue.dependency
      ) ||
      text.includes(
        'dependency'
      ) ||
      text.includes(
        'database'
      ) ||
      text.includes(
        'upstream'
      )
    )
  ) {
    return 4;
  }


  if (
    issue.source ===
      'backend'
  ) {
    return 3;
  }


  if (
    issue.source ===
      'api'
  ) {
    return 2;
  }


  return 1;
}


function rootCauseLayerFor(
  issues:
    CorrelatableIssue[]
): CrossLayerRootCauseLayer {

  const deepest =
    issues
      .map(
        sourceDepth
      )
      .reduce(
        (
          max,
          value
        ) =>
          Math.max(
            max,
            value
          ),

        0
      );


  if (
    deepest === 4
  ) {
    return 'dependency';
  }


  if (
    deepest === 3
  ) {
    return 'backend';
  }


  if (
    deepest === 2
  ) {
    return 'api';
  }


  const sources =
    uniqueSources(
      issues.map(
        issue =>
          issue.source
      )
    );


  if (
    sources.length >
      1
  ) {
    return 'cross-layer';
  }


  if (
    sources.includes(
      'test'
    ) ||
    sources.includes(
      'discovery'
    )
  ) {
    return 'frontend';
  }


  return 'unknown';
}


function rootCauseCandidate(
  issues:
    CorrelatableIssue[]
): CorrelatableIssue {

  return [
    ...issues,
  ].sort(
    (
      a,
      b
    ) => {

      const depthDiff =
        sourceDepth(b) -
        sourceDepth(a);


      if (
        depthDiff !== 0
      ) {
        return depthDiff;
      }


      const confidenceA =
        a.diagnosisConfidence ??
        a.confidence ??
        0;

      const confidenceB =
        b.diagnosisConfidence ??
        b.confidence ??
        0;


      if (
        confidenceA !==
          confidenceB
      ) {
        return (
          confidenceB -
          confidenceA
        );
      }


      return (
        priorityRank(
          priorityFor(b)
        ) -
        priorityRank(
          priorityFor(a)
        )
      );
    }
  )[0];
}


function highestSeverity(
  issues:
    CorrelatableIssue[]
): Severity {

  return issues
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
    )[0] ??
    'medium';
}


function highestPriority(
  issues:
    CorrelatableIssue[]
): IntelligencePriority {

  return issues
    .map(
      priorityFor
    )
    .sort(
      (
        a,
        b
      ) =>
        priorityRank(b) -
        priorityRank(a)
    )[0] ??
    'P4';
}


function issueIsBlocking(
  issue:
    CorrelatableIssue
): boolean {

  const severity =
    normalizeSeverity(
      String(
        issue.severity
      )
    );


  const priority =
    priorityFor(
      issue
    );


  const classification =
    String(
      issue.classification ??
      ''
    )
      .trim()
      .toLowerCase();


  if (
    issue.source ===
      'test'
  ) {
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


function evidenceNode(
  issue:
    CorrelatableIssue
): CrossLayerEvidenceNode {

  return {
    issueFingerprint:
      issue.fingerprint,

    originFingerprint:
      issue.originFingerprint,

    source:
      issue.source,

    title:
      issue.title,

    site:
      issue.site,

    endpoint:
      issue.endpoint,

    service:
      issue.service,

    statusCode:
      issue.statusCode,

    rootCause:
      issue.rootCause,

    confidence:
      issue.diagnosisConfidence ??
      issue.confidence,

    priority:
      priorityFor(issue),

    severity:
      normalizeSeverity(
        String(
          issue.severity
        )
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


function incidentId(
  issues:
    CorrelatableIssue[]
): string {

  const material =
    issues
      .map(
        issue =>
          issue.fingerprint
      )
      .sort()
      .join('|');


  const hash =
    crypto
      .createHash(
        'sha256'
      )
      .update(
        material
      )
      .digest(
        'hex'
      )
      .slice(
        0,
        16
      );


  return (
    `incident:${hash}`
  );
}


function incidentFor(
  issues:
    CorrelatableIssue[]
): CrossLayerIncident {

  const pairScores:
    number[] =
      [];


  const reasons:
    CrossLayerCorrelationReason[] =
      [];


  for (
    let i = 0;
    i < issues.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < issues.length;
      j += 1
    ) {
      const pair =
        pairCorrelation(
          issues[i],
          issues[j]
        );


      if (
        pair.correlates
      ) {
        pairScores.push(
          pair.score
        );

        reasons.push(
          ...pair.reasons
        );
      }
    }
  }


  const correlationScore =
    pairScores.length
      ? Math.round(
          pairScores.reduce(
            (
              total,
              value
            ) =>
              total + value,

            0
          ) /
          pairScores.length
        )
      : 0;


  const candidate =
    rootCauseCandidate(
      issues
    );


  const priority =
    highestPriority(
      issues
    );


  const severity =
    highestSeverity(
      issues
    );


  const endpoints =
    uniqueStrings(
      issues.map(
        issue =>
          issue.endpoint
      )
    );


  const services =
    uniqueStrings(
      issues.map(
        issue =>
          issue.service
      )
    );


  const routes =
    uniqueStrings(
      issues.flatMap(
        routesFor
      )
    );


  const sites =
    uniqueStrings(
      issues.map(
        issue =>
          issue.site
      )
    );


  const statusCodes =
    uniqueNumbers(
      issues.map(
        issue =>
          issue.statusCode
      )
    );


  const requirementIds =
    uniqueStrings(
      issues.flatMap(
        issue =>
          issue.requirementIds ??
          []
      )
    );


  const criticalFlowIds =
    uniqueStrings(
      issues.flatMap(
        issue => [
          ...(
            issue.criticalFlowIds ??
            []
          ),

          ...(
            issue.criticalFlows ??
            []
          ),
        ]
      )
    );


  const flowScenarioIds =
    uniqueStrings(
      issues.flatMap(
        issue =>
          issue.flowScenarioIds ??
          []
      )
    );


  const originFingerprints =
    uniqueStrings(
      issues.map(
        issue =>
          issue.originFingerprint
      )
    );


  return {
    id:
      incidentId(
        issues
      ),

    title:
      candidate.title,

    sources:
      uniqueSources(
        issues.map(
          issue =>
            issue.source
        )
      ),

    issueFingerprints:
      uniqueStrings(
        issues.map(
          issue =>
            issue.fingerprint
        )
      ),

    originFingerprints,

    evidenceChain:
      issues
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            sourceDepth(a) -
            sourceDepth(b)
        )
        .map(
          evidenceNode
        ),

    correlationScore,

    confidence:
      correlationScore,

    confidenceBand:
      confidenceForScore(
        correlationScore
      ),

    reasons:
      [
        ...new Set(
          reasons
        ),
      ],

    rootCauseLayer:
      rootCauseLayerFor(
        issues
      ),

    rootCause:
      candidate.rootCause,

    userImpact:
      candidate.userImpact ??
      issues.find(
        issue =>
          Boolean(
            issue.userImpact
          )
      )?.userImpact,

    recommendation:
      candidate.recommendation ??
      issues.find(
        issue =>
          Boolean(
            issue.recommendation
          )
      )?.recommendation,

    priority,

    severity,

    blocking:
      issues.some(
        issueIsBlocking
      ),

    requirementIds,

    criticalFlowIds,

    flowScenarioIds,

    endpoints,

    services,

    routes,

    sites,

    statusCodes,
  };
}


export function analyzeCrossLayerCorrelation(
  issues:
    CorrelatableIssue[]
): CrossLayerAssessment {

  if (
    issues.length === 0
  ) {
    return {
      state:
        'no-evidence',

      issueCount:
        0,

      correlatedIssueCount:
        0,

      standaloneIssueCount:
        0,

      incidentCount:
        0,

      blockingIncidents:
        0,

      sourceCoverage:
        [],

      incidents:
        [],

      standaloneIssueFingerprints:
        [],
    };
  }


  const union =
    new UnionFind(
      issues.length
    );


  for (
    let i = 0;
    i < issues.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < issues.length;
      j += 1
    ) {
      const pair =
        pairCorrelation(
          issues[i],
          issues[j]
        );


      if (
        pair.correlates
      ) {
        union.union(
          i,
          j
        );
      }
    }
  }


  const groups =
    new Map<
      number,
      CorrelatableIssue[]
    >();


  issues.forEach(
    (
      issue,
      index
    ) => {

      const root =
        union.find(
          index
        );


      const group =
        groups.get(root) ??
        [];


      group.push(
        issue
      );


      groups.set(
        root,
        group
      );
    }
  );


  const incidentGroups:
    CorrelatableIssue[][] =
      [];


  const standalone:
    CorrelatableIssue[] =
      [];


  for (
    const group
    of groups.values()
  ) {
    const sources =
      uniqueSources(
        group.map(
          issue =>
            issue.source
        )
      );


    if (
      group.length >= 2 &&
      sources.length >= 2
    ) {
      incidentGroups.push(
        group
      );
    }
    else {
      standalone.push(
        ...group
      );
    }
  }


  const incidents =
    incidentGroups
      .map(
        incidentFor
      )
      .sort(
        (
          a,
          b
        ) => {

          if (
            a.blocking !==
              b.blocking
          ) {
            return a.blocking
              ? -1
              : 1;
          }


          const priorityDiff =
            priorityRank(
              b.priority
            ) -
            priorityRank(
              a.priority
            );


          if (
            priorityDiff !== 0
          ) {
            return priorityDiff;
          }


          return (
            b.confidence -
            a.confidence
          );
        }
      );


  const correlatedIssueCount =
    incidentGroups.reduce(
      (
        total,
        group
      ) =>
        total +
        group.length,

      0
    );


  let state:
    CrossLayerAssessment['state'];


  if (
    incidents.length > 0 &&
    standalone.length === 0
  ) {
    state =
      'correlated';
  }

  else if (
    incidents.length > 0
  ) {
    state =
      'partial';
  }

  else {
    state =
      'standalone-only';
  }


  return {
    state,

    issueCount:
      issues.length,

    correlatedIssueCount,

    standaloneIssueCount:
      standalone.length,

    incidentCount:
      incidents.length,

    blockingIncidents:
      incidents.filter(
        incident =>
          incident.blocking
      ).length,

    sourceCoverage:
      uniqueSources(
        issues.map(
          issue =>
            issue.source
        )
      ),

    incidents,

    standaloneIssueFingerprints:
      standalone.map(
        issue =>
          issue.fingerprint
      ),
  };
}
