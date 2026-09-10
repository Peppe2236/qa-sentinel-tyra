import type {
  DashboardTestResult,
  IntelligenceSource,
  ReleaseAssessment,
  RiskLevel,
  UxUiArea,
  UxUiAreaAssessment,
  UxUiAssessment,
  UxUiObservationState,
  UxUiStatus,
  UxUiTestEvidence,
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


type ParsedUxObservation = {
  area: UxUiArea;
  state: UxUiObservationState;
};


function normalizedTestFile(
  test: DashboardTestResult
): string {
  return test.file
    .replace(/\\/g, '/')
    .toLowerCase();
}


function isNonSiteVerificationTest(
  test: DashboardTestResult
): boolean {
  const file =
    normalizedTestFile(test);

  return (
    file.startsWith('tests/diagnostics/') ||
    file.includes('/tests/diagnostics/') ||
    file.startsWith('tests/unit/') ||
    file.includes('/tests/unit/') ||
    file.startsWith('tests/auth/') ||
    file.includes('/tests/auth/')
  );
}


function uxObservationsForTest(
  test: DashboardTestResult
): ParsedUxObservation[] {
  if (
    isNonSiteVerificationTest(test)
  ) {
    return [];
  }

  const states =
    new Map<
      UxUiArea,
      UxUiObservationState
    >();

  for (
    const annotation
    of test.annotations ?? []
  ) {
    if (
      annotation.type
        .toLowerCase() !==
      'ux-observation'
    ) {
      continue;
    }

    const description =
      String(
        annotation.description ??
        ''
      ).trim();

    if (!description) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          description
        ) as Record<
          string,
          unknown
        >;

      const area =
        String(
          parsed.area ??
          ''
        )
          .trim()
          .toLowerCase() as UxUiArea;

      if (
        !UX_UI_AREAS.includes(area)
      ) {
        continue;
      }

      const markers = [
        parsed.observation,
        parsed.source,
        parsed.layoutShiftSource,
      ]
        .map(
          value =>
            String(value ?? '')
              .trim()
              .toLowerCase()
        );

      const state:
        UxUiObservationState =
          markers.includes(
            'not-observed'
          )
            ? 'not-observed'
            : 'measured';

      const current =
        states.get(area);

      if (
        current !== 'measured' ||
        state === 'measured'
      ) {
        states.set(area, state);
      }
    }
    catch {
      /* Non-JSON UX notes are context, not verification evidence. */
    }
  }

  return [
    ...states.entries(),
  ].map(
    ([area, state]) => ({
      area,
      state,
    })
  );
}


function measuredUxAreas(
  test: DashboardTestResult
): UxUiArea[] {
  return uxObservationsForTest(test)
    .filter(
      observation =>
        observation.state ===
        'measured'
    )
    .map(
      observation =>
        observation.area
    );
}


function notObservedUxAreas(
  test: DashboardTestResult
): UxUiArea[] {
  return uxObservationsForTest(test)
    .filter(
      observation =>
        observation.state ===
        'not-observed'
    )
    .map(
      observation =>
        observation.area
    );
}


function categoryDerivedAreas(
  test: DashboardTestResult
): UxUiArea[] {
  if (
    isNonSiteVerificationTest(test) ||
    !(test.qualityDimensions ?? [])
      .includes('ux-ui')
  ) {
    return [];
  }

  return uxAreasForCategory(
    test.category
  );
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


  function trustworthyTestResult(
    test: DashboardTestResult
  ): boolean {
    if (test.status === 'passed') {
      return true;
    }

    return !uncertain(
      test.classification
    );
  }


  function realTestEvidence(
    test: DashboardTestResult
  ): boolean {
    return (
      trustworthyTestResult(test) &&
      measuredUxAreas(test)
        .length > 0
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


  const observedUxTests =
    tests.filter(
      test =>
        trustworthyTestResult(test) &&
        uxObservationsForTest(test)
          .length > 0
    );


  const derivedUxTests =
    tests.filter(
      test =>
        trustworthyTestResult(test) &&
        uxObservationsForTest(test)
          .length === 0 &&
        categoryDerivedAreas(test)
          .length > 0
    );


  const testEvidence:
    UxUiTestEvidence[] =
      observedUxTests.map(
        test => ({
          evidenceId:
            test.id,

          origin:
            'explicit-observation',

          measuredAreas:
            measuredUxAreas(test),

          notObservedAreas:
            notObservedUxAreas(test),

          status:
            test.status,

          title:
            test.title,

          file:
            test.file,

          site:
            test.site,

          project:
            test.project,

          browserFamily:
            test.browserFamily,

          profile:
            test.profile,
        })
      );


  const notObservedEvidenceCount =
    testEvidence.filter(
      evidence =>
        evidence.notObservedAreas
          .length > 0
    ).length;


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
            test =>
              measuredUxAreas(test)
                .includes(area)
          );


        const derivedAreaTests =
          derivedUxTests.filter(
            test =>
              categoryDerivedAreas(test)
                .includes(area)
          );


        const notObservedAreaTests =
          observedUxTests.filter(
            test =>
              notObservedUxAreas(test)
                .includes(area)
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

            explicitEvidenceCount: 0,
            derivedEvidenceCount:
              derivedAreaTests.length,
            notObservedEvidenceCount:
              notObservedAreaTests.length,

            evidenceTestIds: [],

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

          explicitEvidenceCount:
            areaTests.length,
          derivedEvidenceCount:
            derivedAreaTests.length,
          notObservedEvidenceCount:
            notObservedAreaTests.length,

          evidenceTestIds:
            unique(
              areaTests.map(
                test => test.id
              )
            ),

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

      explicitEvidenceCount: 0,
      derivedEvidenceCount:
        derivedUxTests.length,
      notObservedEvidenceCount,

      testEvidence,

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

    explicitEvidenceCount:
      uxTests.length,

    derivedEvidenceCount:
      derivedUxTests.length,

    notObservedEvidenceCount,

    testEvidence,

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
