import type {
  DashboardTestResult,
  IntelligenceSource,
  ReleaseAssessment,
  RiskLevel,
  UxUiArea,
  UxUiAreaAssessment,
  UxUiAssessment,
  UxUiStatus,
} from '../models/types';


type UnifiedUxIssue = {
  source?: IntelligenceSource;
  category?: string;
  severity?: string;
  classification?: string;

  qualityDimensions?: string[];

  affectedBrowsers?: string[];
  affectedProfiles?: string[];

  occurrences?: number;
};


export const UX_UI_AREAS:
  UxUiArea[] = [
    'usability',
    'navigation',
    'interaction',
    'forms-validation',
    'accessibility',
    'visual-stability',
    'responsive-usability',
    'content-clarity',
  ];


function unique(
  values:
    string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}


export function uxAreasForCategory(
  category:
    string
): UxUiArea[] {
  switch (
    category.toLowerCase()
  ) {
    case 'navigation':
      return [
        'navigation',
        'usability',
      ];

    case 'accessibility':
      return [
        'accessibility',
        'usability',
      ];

    case 'visual':
      return [
        'visual-stability',
      ];

    case 'responsive':
      return [
        'responsive-usability',
        'usability',
      ];

    case 'content':
      return [
        'content-clarity',
      ];

    case 'javascript':
      return [
        'interaction',
        'usability',
      ];

    case 'authentication':
      return [
        'forms-validation',
        'interaction',
        'usability',
      ];

    default:
      return [];
  }
}


function scoreFromIssues(
  issues:
    UnifiedUxIssue[]
): number {
  let penalty = 0;

  for (const issue of issues) {
    switch (
      String(
        issue.severity ??
        ''
      ).toLowerCase()
    ) {
      case 'critical':
        penalty += 30;
        break;

      case 'high':
        penalty += 20;
        break;

      case 'medium':
        penalty += 10;
        break;

      case 'low':
        penalty += 5;
        break;
    }
  }

  return Math.max(
    0,
    Math.min(
      100,
      100 - penalty
    )
  );
}


function statusFromScore(
  score:
    number
): UxUiStatus {
  if (
    score >= 90
  ) {
    return 'healthy';
  }

  if (
    score >= 70
  ) {
    return 'degraded';
  }

  return 'poor';
}


export function analyzeUxUi(
  tests: DashboardTestResult[],
  unifiedIssues: UnifiedUxIssue[]
): UxUiAssessment {

  function uncertain(
    classification?: string
  ): boolean {
    const value =
      String(classification ?? '')
        .toLowerCase();

    return (
      value === 'automation-issue' ||
      value === 'needs-investigation' ||
      value === 'warning'
    );
  }


  function realTestEvidence(
    test: DashboardTestResult
  ): boolean {
    if (
      !(test.qualityDimensions ?? [])
        .includes('ux-ui')
    ) {
      return false;
    }

    if (test.status === 'passed') {
      return true;
    }

    return !uncertain(
      test.classification
    );
  }


  function realIssueEvidence(
    issue: UnifiedUxIssue
  ): boolean {
    if (
      issue.source === 'discovery' ||
      issue.source === 'api' ||
      issue.source === 'backend'
    ) {
      return true;
    }

    return !uncertain(
      issue.classification
    );
  }


  const uxTests =
    tests.filter(realTestEvidence);


  const uxIssues =
    unifiedIssues.filter(
      issue =>
        (
          (issue.qualityDimensions ?? [])
            .includes('ux-ui') ||
          uxAreasForCategory(
            issue.category ?? ''
          ).length > 0
        )
    );


  const realUxIssues =
    uxIssues.filter(
      realIssueEvidence
    );


  const areas: UxUiAreaAssessment[] =
    UX_UI_AREAS.map(
      area => {

        const areaTests =
          uxTests.filter(
            test => {
              const mapped =
                uxAreasForCategory(
                  test.category
                );

              if (mapped.length === 0) {
                return area === 'usability';
              }

              return mapped.includes(area);
            }
          );


        const areaIssues =
          uxIssues.filter(
            issue => {
              const mapped =
                uxAreasForCategory(
                  issue.category ?? ''
                );

              if (mapped.includes(area)) {
                return true;
              }

              return (
                (issue.qualityDimensions ?? [])
                  .includes('ux-ui') &&
                mapped.length === 0 &&
                area === 'usability'
              );
            }
          );


        const realAreaIssues =
          areaIssues.filter(
            realIssueEvidence
          );


        const sources: IntelligenceSource[] =
          [];

        if (areaTests.length > 0) {
          sources.push('test');
        }

        for (const issue of realAreaIssues) {
          if (
            issue.source &&
            !sources.includes(issue.source)
          ) {
            sources.push(issue.source);
          }
        }


        const evidenceCount =
          areaTests.length +
          realAreaIssues.length;


        const critical =
          realAreaIssues.filter(
            issue =>
              String(issue.severity)
                .toLowerCase() ===
              'critical'
          ).length;

        const high =
          realAreaIssues.filter(
            issue =>
              String(issue.severity)
                .toLowerCase() ===
              'high'
          ).length;

        const medium =
          realAreaIssues.filter(
            issue =>
              String(issue.severity)
                .toLowerCase() ===
              'medium'
          ).length;

        const low =
          realAreaIssues.filter(
            issue =>
              String(issue.severity)
                .toLowerCase() ===
              'low'
          ).length;


        const affectedBrowsers =
          unique(
            areaIssues.flatMap(
              issue =>
                issue.affectedBrowsers ??
                []
            )
          );


        const affectedProfiles =
          unique(
            areaIssues.flatMap(
              issue =>
                issue.affectedProfiles ??
                []
            )
          );


        if (evidenceCount === 0) {
          return {
            area,
            status: 'not-verified',
            evidenceCount: 0,
            issueCount: areaIssues.length,

            critical: 0,
            high: 0,
            medium: 0,
            low: 0,

            affectedBrowsers,
            affectedProfiles,

            evidenceSources: sources,
          };
        }


        const score =
          scoreFromIssues(
            realAreaIssues
          );


        const status: UxUiStatus =
          critical > 0
            ? 'poor'
            : statusFromScore(score);


        return {
          area,
          status,
          score,

          evidenceCount,
          issueCount: areaIssues.length,

          critical,
          high,
          medium,
          low,

          affectedBrowsers,
          affectedProfiles,

          evidenceSources: sources,
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
        area => area.area
      );


  const unverifiedAreas =
    areas
      .filter(
        area =>
          area.status ===
          'not-verified'
      )
      .map(
        area => area.area
      );


  const sourceCoverage:
    IntelligenceSource[] = [];


  if (uxTests.length > 0) {
    sourceCoverage.push('test');
  }


  for (const issue of realUxIssues) {
    if (
      issue.source &&
      !sourceCoverage.includes(
        issue.source
      )
    ) {
      sourceCoverage.push(
        issue.source
      );
    }
  }


  const affectedBrowsers =
    unique(
      uxIssues.flatMap(
        issue =>
          issue.affectedBrowsers ??
          []
      )
    );


  const affectedProfiles =
    unique(
      uxIssues.flatMap(
        issue =>
          issue.affectedProfiles ??
          []
      )
    );


  if (verifiedAreas.length === 0) {
    return {
      status: 'not-verified',

      evidenceCount: 0,
      issueCount: uxIssues.length,

      verifiedAreas,
      unverifiedAreas,

      areas,

      sourceCoverage,
      affectedBrowsers,
      affectedProfiles,
    };
  }


  const scoredAreas =
    areas.filter(
      area =>
        typeof area.score ===
        'number'
    );


  const totalScore =
    scoredAreas.reduce(
      (total, area) =>
        total + (area.score ?? 0),
      0
    );


  const score =
    scoredAreas.length > 0
      ? Math.round(
          totalScore /
          scoredAreas.length
        )
      : 0;


  let status:
    UxUiStatus;


  if (
    areas.some(
      area =>
        area.status === 'poor'
    )
  ) {
    status = 'poor';
  }

  else {
    status =
      statusFromScore(score);

    if (
      status === 'healthy' &&
      unverifiedAreas.length > 0
    ) {
      status = 'degraded';
    }
  }


  return {
    status,
    score,

    evidenceCount:
      uxTests.length +
      realUxIssues.length,

    issueCount:
      uxIssues.length,

    verifiedAreas,
    unverifiedAreas,

    areas,

    sourceCoverage,
    affectedBrowsers,
    affectedProfiles,
  };
}



const UX_RISK_ORDER: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};


function elevateUxRisk(
  current: RiskLevel,
  required: RiskLevel
): RiskLevel {
  if (
    UX_RISK_ORDER[required] >
    UX_RISK_ORDER[current]
  ) {
    return required;
  }

  return current;
}


export function applyUxUiReleaseGate(
  assessment: ReleaseAssessment,
  ux: UxUiAssessment
): ReleaseAssessment {

  const blockingUxAreas =
    ux.areas.filter(
      area =>
        area.critical > 0
    ).length;


  const uxUiGaps =
    ux.areas.filter(
      area =>
        area.status !== 'healthy'
    ).length;


  if (blockingUxAreas > 0) {
    return {
      ...assessment,

      status: 'not-ready',

      risk:
        elevateUxRisk(
          assessment.risk,
          'critical'
        ),

      blockingUxAreas,
      uxUiGaps,

      verdict:
        assessment.verdict +
        ' Critical UX/UI failures affect ' +
        blockingUxAreas +
        ' quality area(s).',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve critical UX/UI failures before release.',
    };
  }


  if (ux.status === 'poor') {
    return {
      ...assessment,

      status:
        assessment.status === 'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateUxRisk(
          assessment.risk,
          'high'
        ),

      blockingUxAreas: 0,
      uxUiGaps,

      verdict:
        assessment.verdict +
        ' UX/UI quality is currently poor.',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve major UX/UI regressions before release.',
    };
  }


  if (
    ux.status === 'degraded' ||
    ux.status === 'not-verified'
  ) {
    return {
      ...assessment,

      status:
        assessment.status === 'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateUxRisk(
          assessment.risk,
          'medium'
        ),

      blockingUxAreas: 0,
      uxUiGaps,

      verdict:
        assessment.verdict +
        ' UX/UI verification is incomplete or degraded.',

      recommendedAction:
        assessment.recommendedAction +
        ' Complete missing usability coverage.',
    };
  }


  return {
    ...assessment,

    blockingUxAreas: 0,
    uxUiGaps: 0,
  };
}
