import type {
  DashboardTestResult,
  IntelligenceSource,
  PerformanceArea,
  PerformanceAreaAssessment,
  PerformanceAssessment,
  SecurityArea,
  SecurityAreaAssessment,
  SecurityAssessment,
  SecurityPerformanceAssessment,
  SecurityPerformanceStatus,
  ReleaseAssessment,
  RiskLevel,
} from '../models/types';

import {
  isSecurityArea,
  requiredSecurityAreas,
  SECURITY_AREAS,
  type SecurityPerformanceConfig,
} from '../utils/security-performance-config';

import {
  isAnalyticsOrTelemetryIssue,
} from '../utils/signal-classification';


type UnifiedSecurityPerformanceIssue = {
  source?:
    IntelligenceSource;

  category?:
    string;

  severity?:
    string;

  classification?:
    string;

  title?:
    string;

  description?:
    string;

  evidence?:
    string;

  errorMessage?:
    string;

  rootCause?:
    string;

  qualityDimensions?:
    string[];
};


type PerformanceInput = {
  totalDuration?:
    number;

  wallClockDuration?:
    number;

  averageDuration?:
    number;

  medianDuration?:
    number;

  p95Duration?:
    number;
};


export {
  isSecurityArea,
  requiredSecurityAreas,
  SECURITY_AREAS,
};


export const PERFORMANCE_AREAS:
  PerformanceArea[] = [
    'test-duration',
    'page-load',
    'api-latency',
    'backend-latency',
    'timeout-resilience',
    'regression',
  ];


function unique<T>(
  values:
    T[]
): T[] {
  return [
    ...new Set(values),
  ];
}


function issueText(
  issue:
    UnifiedSecurityPerformanceIssue
): string {

  return [
    issue.title,
    issue.description,
    issue.evidence,
    issue.errorMessage,
    issue.rootCause,
    issue.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}


function classificationIsUncertain(
  classification:
    string | undefined
): boolean {

  const value =
    String(
      classification ??
      ''
    ).toLowerCase();


  return (
    value === 'automation-issue' ||
    value === 'needs-investigation' ||
    value === 'warning'
  );
}


function statusFromSeverity(
  issues:
    UnifiedSecurityPerformanceIssue[]
): SecurityPerformanceStatus {

  if (
    issues.length === 0
  ) {
    return 'healthy';
  }


  const severities =
    issues.map(
      issue =>
        String(
          issue.severity ??
          ''
        ).toLowerCase()
    );


  if (
    severities.includes(
      'critical'
    )
  ) {
    return 'critical';
  }


  if (
    severities.includes(
      'high'
    )
  ) {
    return 'poor';
  }


  return 'degraded';
}


function validSource(
  source:
    IntelligenceSource |
    undefined
): source is IntelligenceSource {

  return (
    source === 'test' ||
    source === 'discovery' ||
    source === 'api' ||
    source === 'backend'
  );
}


export function securityAreasForIssue(
  issue:
    UnifiedSecurityPerformanceIssue
): SecurityArea[] {

  const category =
    String(
      issue.category ??
      ''
    ).toLowerCase();

  const text =
    issueText(
      issue
    );

  const analyticsTelemetry =
    isAnalyticsOrTelemetryIssue(
      issue
    ) ||
    category ===
      'analytics';


  const areas:
    SecurityArea[] = [];


  if (
    analyticsTelemetry
  ) {
    return [
      'content-security-policy',
    ];
  }


  if (
    category ===
      'network' &&
    !text.includes(
      'tls'
    ) &&
    !text.includes(
      'certificate'
    ) &&
    !text.includes(
      'mixed content'
    )
  ) {
    return [];
  }


  if (
    category ===
      'authentication' ||
    text.includes(
      'authentication'
    ) ||
    text.includes(
      'sign-in'
    ) ||
    text.includes(
      'login'
    )
  ) {
    areas.push(
      'authentication'
    );
  }


  if (
    text.includes(
      'authorization'
    ) ||
    text.includes(
      'unauthorized'
    ) ||
    text.includes(
      'forbidden'
    ) ||
    text.includes(
      '401'
    ) ||
    text.includes(
      '403'
    )
  ) {
    areas.push(
      'authorization'
    );
  }


  if (
    text.includes(
      'content security policy'
    ) ||
    text.includes(
      'content-security-policy'
    ) ||
    text.includes(
      'csp'
    )
  ) {
    areas.push(
      'content-security-policy'
    );
  }


  if (
    text.includes(
      'security header'
    ) ||
    text.includes(
      'x-frame-options'
    ) ||
    text.includes(
      'strict-transport-security'
    )
  ) {
    areas.push(
      'security-headers'
    );
  }


  if (
    text.includes(
      'cookie'
    ) ||
    text.includes(
      'session'
    )
  ) {
    areas.push(
      'session-cookies'
    );
  }


  if (
    text.includes(
      'exposure'
    ) ||
    text.includes(
      'sensitive data'
    ) ||
    text.includes(
      'secret'
    ) ||
    text.includes(
      'credential'
    )
  ) {
    areas.push(
      'data-exposure'
    );
  }


  if (
    text.includes(
      'tls'
    ) ||
    text.includes(
      'ssl certificate'
    ) ||
    text.includes(
      'mixed content'
    ) ||
    text.includes(
      'strict-transport-security'
    ) ||
    /\bhsts\b/.test(
      text
    ) ||
    text.includes(
      'insecure http'
    )
  ) {
    areas.push(
      'transport'
    );
  }


  if (
    text.includes(
      'dependency vulnerability'
    ) ||
    text.includes(
      'npm audit'
    ) ||
    (
      text.includes(
        'supply chain'
      ) &&
      !analyticsTelemetry
    )
  ) {
    areas.push(
      'dependency-security'
    );
  }


  if (
    areas.length === 0 &&
    category ===
      'security'
  ) {
    areas.push(
      'data-exposure'
    );
  }


  return unique(
    areas
  );
}


export function performanceAreasForIssue(
  issue:
    UnifiedSecurityPerformanceIssue
): PerformanceArea[] {

  const category =
    String(
      issue.category ??
      ''
    ).toLowerCase();

  const text =
    issueText(
      issue
    );


  const areas:
    PerformanceArea[] = [];


  if (
    category ===
      'performance' ||
    text.includes(
      'slow'
    ) ||
    text.includes(
      'duration'
    )
  ) {
    areas.push(
      'test-duration'
    );
  }


  if (
    text.includes(
      'page load'
    ) ||
    text.includes(
      'page-load'
    )
  ) {
    areas.push(
      'page-load'
    );
  }


  if (
    (
      category ===
        'api' ||
      issue.source ===
        'api'
    ) &&
    (
      text.includes(
        'latency'
      ) ||
      text.includes(
        'slow'
      ) ||
      category ===
        'performance'
    )
  ) {
    areas.push(
      'api-latency'
    );
  }


  if (
    issue.source ===
      'backend' &&
    (
      text.includes(
        'latency'
      ) ||
      text.includes(
        'slow'
      ) ||
      text.includes(
        'timeout'
      )
    )
  ) {
    areas.push(
      'backend-latency'
    );
  }


  if (
    text.includes(
      'timeout'
    ) ||
    text.includes(
      'timed out'
    )
  ) {
    areas.push(
      'timeout-resilience'
    );
  }


  if (
    text.includes(
      'regression'
    )
  ) {
    areas.push(
      'regression'
    );
  }


  return unique(
    areas
  );
}


export function securityAreasForTest(
  test:
    DashboardTestResult
): SecurityArea[] {

  const category =
    String(
      test.category ??
      ''
    ).toLowerCase();

  const areas:
    SecurityArea[] = [];


  if (
    isSecurityArea(
      category
    )
  ) {
    areas.push(
      category
    );
  }

  else if (
    category ===
      'security'
  ) {
    areas.push(
      'data-exposure'
    );
  }


  for (
    const annotation
    of test.annotations ??
      []
  ) {
    const type =
      String(
        annotation.type ??
        ''
      ).toLowerCase();

    if (
      type !==
        'security-area' &&
      type !==
        'security-check' &&
      type !==
        'required-check'
    ) {
      continue;
    }

    const values =
      String(
        annotation.description ??
        ''
      )
        .split(
          /[,;|]/
        )
        .map(
          value =>
            value
              .trim()
              .toLowerCase()
        )
        .filter(
          Boolean
        );

    for (
      const value
      of values
    ) {
      if (
        isSecurityArea(
          value
        )
      ) {
        areas.push(
          value
        );
      }
    }
  }


  return unique(
    areas
  );
}


function performanceAreaForTest(
  test:
    DashboardTestResult
): PerformanceArea[] {

  const category =
    String(
      test.category ??
      ''
    ).toLowerCase();


  if (
    category ===
      'performance'
  ) {
    return [
      'test-duration',
    ];
  }


  return [];
}


function sourceCoverageForIssues(
  issues:
    UnifiedSecurityPerformanceIssue[]
): IntelligenceSource[] {

  return unique(
    issues
      .map(
        issue =>
          issue.source
      )
      .filter(
        validSource
      )
  );
}


function catalogSecurityAreas(
  config:
    SecurityPerformanceConfig
): SecurityArea[] {
  const required =
    requiredSecurityAreas(
      config
    );

  return required.length > 0
    ? required
    : [
        ...SECURITY_AREAS,
      ];
}


function analyzeSecurity(
  tests:
    DashboardTestResult[],

  issues:
    UnifiedSecurityPerformanceIssue[],

  config:
    SecurityPerformanceConfig
): SecurityAssessment {

  const catalogAreas =
    catalogSecurityAreas(
      config
    );


  const securityTests =
    tests.filter(
      test =>
        test.status === 'passed' &&
        (
          test.qualityDimensions ??
          []
        ).includes(
          'security-performance'
        ) &&
        securityAreasForTest(
          test
        ).length > 0
    );


  const securityIssues =
    issues.filter(
      issue =>
        !classificationIsUncertain(
          issue.classification
        ) &&
        securityAreasForIssue(
          issue
        ).length > 0
    );


  const evidencedAreas =
    unique(
      [
        ...securityTests.flatMap(
          test =>
            securityAreasForTest(
              test
            )
        ),

        ...securityIssues.flatMap(
          issue =>
            securityAreasForIssue(
              issue
            )
        ),
      ]
    );


  const extraAreas =
    evidencedAreas.filter(
      area =>
        !catalogAreas.includes(
          area
        )
    );


  const scopedAreas =
    unique(
      [
        ...catalogAreas,
        ...SECURITY_AREAS.filter(
          area =>
            extraAreas.includes(
              area
            )
        ),
      ]
    );


  const areas:
    SecurityAreaAssessment[] =
      scopedAreas.map(
        area => {

          const required =
            catalogAreas.includes(
              area
            );


          const areaTests =
            securityTests.filter(
              test =>
                securityAreasForTest(
                  test
                ).includes(
                  area
                )
            );


          const areaIssues =
            securityIssues.filter(
              issue =>
                securityAreasForIssue(
                  issue
                ).includes(
                  area
                )
            );


          const sources:
            IntelligenceSource[] =
              [];


          if (
            areaTests.length > 0
          ) {
            sources.push(
              'test'
            );
          }


          for (
            const source
            of sourceCoverageForIssues(
              areaIssues
            )
          ) {
            if (
              !sources.includes(
                source
              )
            ) {
              sources.push(
                source
              );
            }
          }


          const evidenceCount =
            areaTests.length +
            areaIssues.length;


          if (
            evidenceCount === 0
          ) {
            return {
              area,

              status:
                'not-verified',

              required,

              evidenceCount:
                0,

              issueCount:
                0,

              critical:
                0,

              high:
                0,

              medium:
                0,

              low:
                0,

              evidenceSources:
                sources,
            };
          }


          let areaStatus =
            statusFromSeverity(
              areaIssues
            );

          if (
            area ===
              'content-security-policy' &&
            areaIssues.length >
              0 &&
            areaIssues.every(
              issue =>
                isAnalyticsOrTelemetryIssue(
                  issue
                ) ||
                String(
                  issue.category ??
                  ''
                ).toLowerCase() ===
                  'analytics'
            )
          ) {
            if (
              areaStatus ===
                'critical' ||
              areaStatus ===
                'poor'
            ) {
              areaStatus =
                'degraded';
            }
          }


          return {
            area,

            status:
              areaStatus,

            required,

            evidenceCount,

            issueCount:
              areaIssues.length,

            critical:
              areaIssues.filter(
                issue =>
                  issue.severity ===
                    'critical'
              ).length,

            high:
              areaIssues.filter(
                issue =>
                  issue.severity ===
                    'high'
              ).length,

            medium:
              areaIssues.filter(
                issue =>
                  issue.severity ===
                    'medium'
              ).length,

            low:
              areaIssues.filter(
                issue =>
                  issue.severity ===
                    'low'
              ).length,

            evidenceSources:
              sources,
          };
        }
      );


  const verifiedAreas =
    areas
      .filter(
        area =>
          area.status !==
            'not-verified'
      )
      .map(
        area =>
          area.area
      );


  const unverifiedAreas =
    areas
      .filter(
        area =>
          area.required &&
          area.status ===
            'not-verified'
      )
      .map(
        area =>
          area.area
      );


  let status:
    SecurityPerformanceStatus;


  if (
    verifiedAreas.length === 0
  ) {
    status =
      'not-verified';
  }

  else if (
    areas.some(
      area =>
        area.status ===
          'critical'
    )
  ) {
    status =
      'critical';
  }

  else if (
    areas.some(
      area =>
        area.status ===
          'poor'
    )
  ) {
    status =
      'poor';
  }

  else if (
    areas.some(
      area =>
        area.status ===
          'degraded'
    )
  ) {
    status =
      'degraded';
  }

  else if (
    unverifiedAreas.length > 0
  ) {
    status =
      'not-verified';
  }

  else {
    status =
      'healthy';
  }


  const sources:
    IntelligenceSource[] =
      [];


  if (
    securityTests.length > 0
  ) {
    sources.push(
      'test'
    );
  }


  for (
    const source
    of sourceCoverageForIssues(
      securityIssues
    )
  ) {
    if (
      !sources.includes(
        source
      )
    ) {
      sources.push(
        source
      );
    }
  }


  return {
    status,

    evidenceCount:
      securityTests.length +
      securityIssues.length,

    issueCount:
      securityIssues.length,

    requiredChecks:
      catalogAreas,

    verifiedAreas,

    unverifiedAreas,

    areas,

    sourceCoverage:
      sources,
  };
}


function thresholdForArea(
  area:
    PerformanceArea,

  config:
    SecurityPerformanceConfig
): number | undefined {

  const thresholds =
    config.performance
      .thresholds;


  switch (area) {
    case 'test-duration':
      return thresholds
        .p95DurationMs;

    case 'page-load':
      return thresholds
        .pageLoadMs;

    case 'api-latency':
      return thresholds
        .apiLatencyMs;

    case 'backend-latency':
      return thresholds
        .backendLatencyMs;

    default:
      return undefined;
  }
}


function observedValueForArea(
  area:
    PerformanceArea,

  performance:
    PerformanceInput
): number | undefined {

  if (
    area ===
      'test-duration'
  ) {
    return performance
      .p95Duration;
  }

  return undefined;
}


function analyzePerformance(
  tests:
    DashboardTestResult[],

  issues:
    UnifiedSecurityPerformanceIssue[],

  performance:
    PerformanceInput,

  config:
    SecurityPerformanceConfig
): PerformanceAssessment {

  const performanceTests =
    tests.filter(
      test =>
        test.status === 'passed' &&
        (
          test.qualityDimensions ??
          []
        ).includes(
          'security-performance'
        ) &&
        performanceAreaForTest(
          test
        ).length > 0
    );


  const performanceIssues =
    issues.filter(
      issue =>
        !classificationIsUncertain(
          issue.classification
        ) &&
        performanceAreasForIssue(
          issue
        ).length > 0
    );


  const areas:
    PerformanceAreaAssessment[] =
      PERFORMANCE_AREAS.map(
        area => {

          const areaTests =
            performanceTests.filter(
              test =>
                performanceAreaForTest(
                  test
                ).includes(
                  area
                )
            );


          const areaIssues =
            performanceIssues.filter(
              issue =>
                performanceAreasForIssue(
                  issue
                ).includes(
                  area
                )
            );


          const threshold =
            thresholdForArea(
              area,
              config
            );


          const observed =
            observedValueForArea(
              area,
              performance
            );


          const thresholdConfigured =
            typeof threshold ===
              'number';


          const sources:
            IntelligenceSource[] =
              [];


          if (
            areaTests.length > 0
          ) {
            sources.push(
              'test'
            );
          }


          for (
            const source
            of sourceCoverageForIssues(
              areaIssues
            )
          ) {
            if (
              !sources.includes(
                source
              )
            ) {
              sources.push(
                source
              );
            }
          }


          const evidenceCount =
            areaTests.length +
            areaIssues.length +
            (
              typeof observed ===
                'number'
                ? 1
                : 0
            );


          let status:
            SecurityPerformanceStatus;


          if (
            areaIssues.length > 0
          ) {
            status =
              statusFromSeverity(
                areaIssues
              );
          }

          else if (
            thresholdConfigured &&
            typeof observed ===
              'number'
          ) {
            status =
              observed <= threshold
                ? 'healthy'
                : 'poor';
          }

          else {
            status =
              'not-verified';
          }


          return {
            area,

            status,

            evidenceCount,

            issueCount:
              areaIssues.length,

            observedValueMs:
              observed,

            thresholdMs:
              threshold,

            thresholdConfigured,

            evidenceSources:
              sources,
          };
        }
      );


  const verifiedAreas =
    areas
      .filter(
        area =>
          area.status !==
            'not-verified'
      )
      .map(
        area =>
          area.area
      );


  const unverifiedAreas =
    areas
      .filter(
        area =>
          area.status ===
            'not-verified'
      )
      .map(
        area =>
          area.area
      );


  let status:
    SecurityPerformanceStatus;


  if (
    verifiedAreas.length === 0
  ) {
    status =
      'not-verified';
  }

  else if (
    areas.some(
      area =>
        area.status ===
          'critical'
    )
  ) {
    status =
      'critical';
  }

  else if (
    areas.some(
      area =>
        area.status ===
          'poor'
    )
  ) {
    status =
      'poor';
  }

  else if (
    areas.some(
      area =>
        area.status ===
          'degraded'
    )
  ) {
    status =
      'degraded';
  }

  else if (
    unverifiedAreas.length > 0
  ) {
    status =
      'not-verified';
  }

  else {
    status =
      'healthy';
  }


  const sources:
    IntelligenceSource[] =
      [];


  if (
    performanceTests.length > 0
  ) {
    sources.push(
      'test'
    );
  }


  for (
    const source
    of sourceCoverageForIssues(
      performanceIssues
    )
  ) {
    if (
      !sources.includes(
        source
      )
    ) {
      sources.push(
        source
      );
    }
  }


  const thresholds =
    config.performance
      .thresholds;


  const thresholdsConfigured =
    Object.values(
      thresholds
    ).some(
      value =>
        typeof value ===
          'number'
    );


  return {
    status,

    evidenceCount:
      performanceTests.length +
      performanceIssues.length +
      Object.values(
        performance
      ).filter(
        value =>
          typeof value ===
            'number'
      ).length,

    issueCount:
      performanceIssues.length,

    thresholdsConfigured,

    observed: {
      totalDuration:
        performance.totalDuration,

      wallClockDuration:
        performance.wallClockDuration,

      averageDuration:
        performance.averageDuration,

      medianDuration:
        performance.medianDuration,

      p95Duration:
        performance.p95Duration,
    },

    verifiedAreas,

    unverifiedAreas,

    areas,

    sourceCoverage:
      sources,
  };
}


export function analyzeSecurityPerformance(
  tests:
    DashboardTestResult[],

  unifiedIssues:
    UnifiedSecurityPerformanceIssue[],

  performance:
    PerformanceInput,

  config:
    SecurityPerformanceConfig
): SecurityPerformanceAssessment {

  const security =
    analyzeSecurity(
      tests,
      unifiedIssues,
      config
    );


  const performanceAssessment =
    analyzePerformance(
      tests,
      unifiedIssues,
      performance,
      config
    );


  const sourceCoverage =
    unique(
      [
        ...security
          .sourceCoverage,

        ...performanceAssessment
          .sourceCoverage,
      ]
    );


  let status:
    SecurityPerformanceStatus;


  if (
    security.status ===
      'critical' ||
    performanceAssessment.status ===
      'critical'
  ) {
    status =
      'critical';
  }

  else if (
    security.status ===
      'poor' ||
    performanceAssessment.status ===
      'poor'
  ) {
    status =
      'poor';
  }

  else if (
    security.status ===
      'degraded' ||
    performanceAssessment.status ===
      'degraded'
  ) {
    status =
      'degraded';
  }

  else if (
    security.status ===
      'healthy' &&
    performanceAssessment.status ===
      'healthy'
  ) {
    status =
      'healthy';
  }

  else {
    status =
      'not-verified';
  }


  return {
    status,

    security,

    performance:
      performanceAssessment,

    sourceCoverage,
  };
}



const SECURITY_PERFORMANCE_RISK_ORDER:
  Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };


function elevateSecurityPerformanceRisk(
  current: RiskLevel,
  required: RiskLevel
): RiskLevel {

  if (
    SECURITY_PERFORMANCE_RISK_ORDER[required] >
    SECURITY_PERFORMANCE_RISK_ORDER[current]
  ) {
    return required;
  }

  return current;
}


export function applySecurityPerformanceReleaseGate(
  assessment:
    ReleaseAssessment,

  intelligence:
    SecurityPerformanceAssessment
): ReleaseAssessment {

  const blockingSecurityAreas =
    intelligence.security.areas.filter(
      area =>
        area.status === 'critical'
    ).length;


  const blockingPerformanceAreas =
    intelligence.performance.areas.filter(
      area =>
        area.status === 'critical'
    ).length;


  const securityGaps =
    intelligence.security.areas.filter(
      area =>
        area.required !==
          false &&
        area.status !==
          'healthy'
    ).length;


  const performanceGaps =
    intelligence.performance.areas.filter(
      area =>
        area.status !== 'healthy'
    ).length;


  if (
    blockingSecurityAreas > 0 ||
    blockingPerformanceAreas > 0
  ) {
    return {
      ...assessment,

      status:
        'not-ready',

      risk:
        elevateSecurityPerformanceRisk(
          assessment.risk,
          'critical'
        ),

      blockingSecurityAreas,
      blockingPerformanceAreas,

      securityGaps,
      performanceGaps,

      verdict:
        assessment.verdict +
        ' Critical Security or Performance evidence blocks release.',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve all critical Security and Performance failures before release.',
    };
  }


  if (
    intelligence.security.status === 'poor' ||
    intelligence.performance.status === 'poor'
  ) {
    return {
      ...assessment,

      status:
        assessment.status === 'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateSecurityPerformanceRisk(
          assessment.risk,
          'high'
        ),

      blockingSecurityAreas: 0,
      blockingPerformanceAreas: 0,

      securityGaps,
      performanceGaps,

      verdict:
        assessment.verdict +
        ' Security or Performance quality is currently poor.',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve major Security and Performance regressions before release.',
    };
  }


  if (
    intelligence.security.status === 'degraded' ||
    intelligence.security.status === 'not-verified' ||
    intelligence.performance.status === 'degraded' ||
    intelligence.performance.status === 'not-verified'
  ) {
    return {
      ...assessment,

      status:
        assessment.status === 'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateSecurityPerformanceRisk(
          assessment.risk,
          'medium'
        ),

      blockingSecurityAreas: 0,
      blockingPerformanceAreas: 0,

      securityGaps,
      performanceGaps,

      verdict:
        assessment.verdict +
        ' Security or Performance verification is incomplete or degraded.',

      recommendedAction:
        assessment.recommendedAction +
        ' Complete missing Security verification and Performance thresholds.',
    };
  }


  return {
    ...assessment,

    blockingSecurityAreas: 0,
    blockingPerformanceAreas: 0,

    securityGaps: 0,
    performanceGaps: 0,
  };
}
