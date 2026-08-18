import type {
  CompatibilityAssessment,
  CompatibilityCorrelation,
  CompatibilityCorrelationPattern,
  CompatibilityEnvironmentAssessment,
  CompatibilityEnvironmentKind,
  CompatibilityExpectedCoverage,
  CompatibilityStatus,
  DashboardTestResult,
  IntelligenceSource,
  ReleaseAssessment,
  RiskLevel,
} from '../models/types';


type CompatibilityIssue = {
  source?:
    IntelligenceSource;

  severity?:
    string;

  classification?:
    string;

  affectedBrowsers?:
    string[];

  affectedProfiles?:
    string[];

  affectedProjects?:
    string[];

  category?:
    string;

  qualityDimensions?:
    string[];

};


type TestState =
  | 'passed'
  | 'confirmed-failure'
  | 'uncertain'
  | 'other';


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


function uncertainClassification(
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


function testState(
  test:
    DashboardTestResult
): TestState {

  if (
    test.status === 'passed'
  ) {
    return 'passed';
  }


  if (
    test.status === 'failed' ||
    test.status === 'timedOut' ||
    test.status === 'interrupted'
  ) {
    return uncertainClassification(
      test.classification
    )
      ? 'uncertain'
      : 'confirmed-failure';
  }


  return 'other';
}


/*
 * Milestone 5.6 Compatibility Correlation v2.2
 *
 * Logical test identity is independent from its
 * execution environment.
 *
 * Browser, profile and project remain evidence
 * metadata and are compared AFTER logical grouping.
 */
function compatibilityLogicalTestKey(
  test: {
    site?: string;
    file?: string;
    title?: string;
  }
): string {

  const site =
    String(
      test.site ??
      ''
    )
      .trim()
      .toLowerCase();


  const file =
    String(
      test.file ??
      ''
    )
      .replace(/\\/g, '/')
      .trim()
      .toLowerCase();


  const title =
    String(
      test.title ??
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();


  return JSON.stringify([
    site,
    file,
    title,
  ]);
}


function correlationKey(
  test:
    DashboardTestResult
): string {

  return compatibilityLogicalTestKey(
    test
  );
}


function isMobileProfile(
  profile:
    string
): boolean {

  const value =
    profile.toLowerCase();

  return (
    value.includes('mobile') ||
    value.includes('safari') &&
      value.includes('mobile')
  );
}


function correlationPattern(
  tests:
    DashboardTestResult[]
): {
  pattern:
    CompatibilityCorrelationPattern;

  status:
    CompatibilityStatus;
} {

  const projects =
    unique(
      tests.map(
        test =>
          test.project
      )
    );


  if (
    projects.length < 2
  ) {
    return {
      pattern:
        'not-comparable',

      status:
        'not-verified',
    };
  }


  const passed =
    tests.filter(
      test =>
        testState(test) ===
        'passed'
    );


  const failed =
    tests.filter(
      test =>
        testState(test) ===
        'confirmed-failure'
    );


  const uncertain =
    tests.filter(
      test =>
        testState(test) ===
        'uncertain'
    );


  if (
    failed.length === 0 &&
    uncertain.length === 0 &&
    passed.length > 0
  ) {
    return {
      pattern:
        'consistent-pass',

      status:
        'healthy',
    };
  }


  if (
    failed.length > 0 &&
    passed.length === 0
  ) {
    return {
      pattern:
        'universal-failure',

      status:
        'not-verified',
    };
  }


  if (
    failed.length === 0 &&
    uncertain.length > 0
  ) {
    return {
      pattern:
        'uncertain',

      status:
        'degraded',
    };
  }


  if (
    failed.length > 0 &&
    passed.length > 0
  ) {
    const failedProjects =
      unique(
        failed.map(
          test =>
            test.project
        )
      );


    const failedBrowsers =
      unique(
        failed.map(
          test =>
            test.browserFamily
        )
      );


    const passedBrowsers =
      unique(
        passed.map(
          test =>
            test.browserFamily
        )
      );


    const failedProfiles =
      unique(
        failed.map(
          test =>
            test.profile
        )
      );


    const passedProfiles =
      unique(
        passed.map(
          test =>
            test.profile
        )
      );


    let pattern:
      CompatibilityCorrelationPattern;


    if (
      failedProjects.length === 1
    ) {
      pattern =
        'isolated-environment';
    }

    else if (
      failedBrowsers.length === 1 &&
      passedBrowsers.some(
        browser =>
          browser !==
          failedBrowsers[0]
      )
    ) {
      pattern =
        'browser-specific';
    }

    else if (
      failedProfiles.length > 0 &&
      failedProfiles.every(
        isMobileProfile
      ) &&
      passedProfiles.some(
        profile =>
          !isMobileProfile(
            profile
          )
      )
    ) {
      pattern =
        'mobile-specific';
    }

    else if (
      failedProfiles.length === 1 &&
      passedProfiles.some(
        profile =>
          profile !==
          failedProfiles[0]
      )
    ) {
      pattern =
        'profile-specific';
    }

    else {
      pattern =
        'mixed-regression';
    }


    const critical =
      failed.some(
        test =>
          String(
            test.severity
          ).toLowerCase() ===
          'critical'
      );


    return {
      pattern,

      status:
        critical
          ? 'critical'
          : 'poor',
    };
  }


  return {
    pattern:
      'uncertain',

    status:
      'degraded',
  };
}


function buildCorrelations(
  tests:
    DashboardTestResult[]
): CompatibilityCorrelation[] {

  const groups =
    new Map<
      string,
      DashboardTestResult[]
    >();


  for (const test of tests) {
    const key =
      correlationKey(
        test
      );

    const existing =
      groups.get(key) ??
      [];

    existing.push(test);

    groups.set(
      key,
      existing
    );
  }


  const correlations:
    CompatibilityCorrelation[] =
      [];


  for (
    const [key, group]
    of groups
  ) {
    const result =
      correlationPattern(
        group
      );


    const passed =
      group.filter(
        test =>
          testState(test) ===
          'passed'
      );


    const failed =
      group.filter(
        test =>
          testState(test) ===
          'confirmed-failure'
      );


    const uncertain =
      group.filter(
        test =>
          testState(test) ===
          'uncertain'
      );


    const first =
      group[0];


    correlations.push({
      key,

      title:
        first.fullTitle,

      file:
        first.file,

      site:
        first.site,

      status:
        result.status,

      pattern:
        result.pattern,

      totalEnvironments:
        unique(
          group.map(
            test =>
              test.project
          )
        ).length,

      passingEnvironments:
        unique(
          passed.map(
            test =>
              test.project
          )
        ),

      failingEnvironments:
        unique(
          failed.map(
            test =>
              test.project
          )
        ),

      uncertainEnvironments:
        unique(
          uncertain.map(
            test =>
              test.project
          )
        ),

      browsers:
        unique(
          group.map(
            test =>
              test.browserFamily
          )
        ),

      profiles:
        unique(
          group.map(
            test =>
              test.profile
          )
        ),
    });
  }


  return correlations;
}


function issueIsConfirmed(
  issue:
    CompatibilityIssue
): boolean {

  return !uncertainClassification(
    issue.classification
  );
}


function issueIsCompatibilityEvidence(
  issue:
    CompatibilityIssue
): boolean {

  if (
    !issueIsConfirmed(
      issue
    )
  ) {
    return false;
  }


  if (
    (
      issue.qualityDimensions ??
      []
    ).includes(
      'compatibility'
    )
  ) {
    return true;
  }


  return (
    String(
      issue.category ??
      ''
    ).toLowerCase() ===
    'responsive'
  );
}


function issueMatchesEnvironment(
  issue:
    CompatibilityIssue,

  kind:
    CompatibilityEnvironmentKind,

  environment:
    string
): boolean {

  if (
    kind === 'browser'
  ) {
    return (
      issue.affectedBrowsers ??
      []
    ).includes(
      environment
    );
  }


  if (
    kind === 'profile'
  ) {
    return (
      issue.affectedProfiles ??
      []
    ).includes(
      environment
    );
  }


  return (
    issue.affectedProjects ??
    []
  ).includes(
    environment
  );
}


function testMatchesEnvironment(
  test:
    DashboardTestResult,

  kind:
    CompatibilityEnvironmentKind,

  environment:
    string
): boolean {

  if (
    kind === 'browser'
  ) {
    return (
      test.browserFamily ===
      environment
    );
  }


  if (
    kind === 'profile'
  ) {
    return (
      test.profile ===
      environment
    );
  }


  return (
    test.project ===
    environment
  );
}


function correlationFailsEnvironment(
  correlation:
    CompatibilityCorrelation,

  tests:
    DashboardTestResult[],

  kind:
    CompatibilityEnvironmentKind,

  environment:
    string
): boolean {

  if (
    correlation.status !== 'poor' &&
    correlation.status !== 'critical'
  ) {
    return false;
  }


  const failingProjects =
    new Set(
      correlation
        .failingEnvironments
    );


  return tests.some(
    test =>
      correlationKey(test) ===
        correlation.key &&
      failingProjects.has(
        test.project
      ) &&
      testMatchesEnvironment(
        test,
        kind,
        environment
      )
  );
}


function buildEnvironmentAssessments(
  kind:
    CompatibilityEnvironmentKind,

  observed:
    string[],

  expected:
    string[],

  tests:
    DashboardTestResult[],

  issues:
    CompatibilityIssue[],

  correlations:
    CompatibilityCorrelation[]
): CompatibilityEnvironmentAssessment[] {

  const environments =
    unique([
      ...observed,
      ...expected,
    ]);


  return environments.map(
    environment => {

      const environmentTests =
        tests.filter(
          test =>
            testMatchesEnvironment(
              test,
              kind,
              environment
            )
        );


      const confirmedIssues =
        issues.filter(
          issue =>
            issueIsCompatibilityEvidence(
              issue
            ) &&
            issueMatchesEnvironment(
              issue,
              kind,
              environment
            )
        );


      const compatibilityFailures =
        correlations.filter(
          correlation =>
            correlationFailsEnvironment(
              correlation,
              tests,
              kind,
              environment
            )
        );


      const uncertainFailures =
        environmentTests.filter(
          test =>
            testState(test) ===
            'uncertain'
        ).length;


      const passed =
        environmentTests.filter(
          test =>
            testState(test) ===
            'passed'
        ).length;


      const critical =
        compatibilityFailures.some(
          correlation =>
            correlation.status ===
            'critical'
        ) ||
        confirmedIssues.some(
          issue =>
            String(
              issue.severity ??
              ''
            ).toLowerCase() ===
            'critical'
        );


      const highIssue =
        confirmedIssues.some(
          issue =>
            String(
              issue.severity ??
              ''
            ).toLowerCase() ===
            'high'
        );


      let status:
        CompatibilityStatus;


      let notes:
        string[] |
        undefined;


      if (
        environmentTests.length === 0
      ) {
        status =
          'not-in-this-run';

        notes = [
          'Not in this run. This is not a failed check.',
        ];
      }

      else if (
        critical
      ) {
        status =
          'critical';
      }

      else if (
        compatibilityFailures.length > 0 ||
        highIssue
      ) {
        status =
          'poor';
      }

      else if (
        uncertainFailures > 0 ||
        confirmedIssues.length > 0
      ) {
        status =
          'degraded';
      }

      else if (
        passed === 0
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
          environmentTests.length > 0
            ? ['test']
            : [];


      for (
        const issue
        of confirmedIssues
      ) {
        if (
          issue.source &&
          !sources.includes(
            issue.source
          )
        ) {
          sources.push(
            issue.source
          );
        }
      }


      return {
        kind,

        environment,

        status,

        evidenceCount:
          environmentTests.length +
          confirmedIssues.length,

        totalTests:
          environmentTests.length,

        passed,

        compatibilityFailures:
          compatibilityFailures.length,

        uncertainFailures,

        issueCount:
          confirmedIssues.length,

        evidenceSources:
          sources,

        notes,
      };
    }
  );
}


export function analyzeCompatibility(
  tests:
    DashboardTestResult[],

  unifiedIssues:
    CompatibilityIssue[],

  expected:
    CompatibilityExpectedCoverage = {}
): CompatibilityAssessment {

  const correlations =
    buildCorrelations(
      tests
    );


  const observedBrowsers =
    unique(
      tests.map(
        test =>
          test.browserFamily
      )
    );


  const observedProfiles =
    unique(
      tests.map(
        test =>
          test.profile
      )
    );


  const observedProjects =
    unique(
      tests.map(
        test =>
          test.project
      )
    );


  const expectedBrowsers =
    unique(
      expected.browsers ??
      []
    );


  const expectedProfiles =
    unique(
      expected.profiles ??
      []
    );


  const expectedProjects =
    unique(
      expected.projects ??
      []
    );


  const browserAssessments =
    buildEnvironmentAssessments(
      'browser',
      observedBrowsers,
      expectedBrowsers,
      tests,
      unifiedIssues,
      correlations
    );


  const profileAssessments =
    buildEnvironmentAssessments(
      'profile',
      observedProfiles,
      expectedProfiles,
      tests,
      unifiedIssues,
      correlations
    );


  const projectAssessments =
    buildEnvironmentAssessments(
      'project',
      observedProjects,
      expectedProjects,
      tests,
      unifiedIssues,
      correlations
    );


  const missingBrowsers =
    expectedBrowsers.filter(
      browser =>
        !observedBrowsers.includes(
          browser
        )
    );


  const missingProfiles =
    expectedProfiles.filter(
      profile =>
        !observedProfiles.includes(
          profile
        )
    );


  const missingProjects =
    expectedProjects.filter(
      project =>
        !observedProjects.includes(
          project
        )
    );


  const comparable =
    correlations.filter(
      correlation =>
        correlation.pattern !==
        'not-comparable'
    );


  const compatibilityEvidence =
    correlations.filter(
      correlation =>
        correlation.pattern !==
          'not-comparable' &&
        correlation.pattern !==
          'universal-failure'
    );


  const regressions =
    correlations.filter(
      correlation =>
        correlation.status ===
          'poor' ||
        correlation.status ===
          'critical'
    );


  let status:
    CompatibilityStatus;


  const measuredBrowserStatuses =
    browserAssessments.filter(
      assessment =>
        assessment.status !==
          'not-in-this-run'
    );


  if (
    compatibilityEvidence.length === 0
  ) {
    if (
      measuredBrowserStatuses.some(
        assessment =>
          assessment.status ===
            'critical'
      )
    ) {
      status =
        'critical';
    }

    else if (
      measuredBrowserStatuses.some(
        assessment =>
          assessment.status ===
            'poor'
      )
    ) {
      status =
        'poor';
    }

    else if (
      measuredBrowserStatuses.some(
        assessment =>
          assessment.status ===
            'degraded'
      )
    ) {
      status =
        'degraded';
    }

    else if (
      measuredBrowserStatuses.some(
        assessment =>
          assessment.status ===
            'healthy'
      )
    ) {
      status =
        'healthy';
    }

    else {
      status =
        'not-verified';
    }
  }

  else if (
    regressions.some(
      correlation =>
        correlation.status ===
        'critical'
    )
  ) {
    status =
      'critical';
  }

  else if (
    regressions.length > 0
  ) {
    status =
      'poor';
  }

  else if (
    compatibilityEvidence.some(
      correlation =>
        correlation.status ===
          'degraded'
    )
  ) {
    status =
      'degraded';
  }

  else {
    status =
      'healthy';
  }


  const sourceCoverage:
    IntelligenceSource[] =
      tests.length > 0
        ? ['test']
        : [];


  for (
    const issue
    of unifiedIssues
  ) {
    if (
      issueIsCompatibilityEvidence(
        issue
      ) &&
      issue.source &&
      (
        (issue.affectedBrowsers ??
          []).length > 0 ||
        (issue.affectedProfiles ??
          []).length > 0 ||
        (issue.affectedProjects ??
          []).length > 0
      ) &&
      !sourceCoverage.includes(
        issue.source
      )
    ) {
      sourceCoverage.push(
        issue.source
      );
    }
  }


  return {
    status,

    evidenceCount:
      tests.length +
      unifiedIssues.filter(
        issue =>
          issueIsConfirmed(issue)
      ).length,

    comparableTests:
      comparable.length,

    regressions:
      regressions.length,

    browserAssessments,

    profileAssessments,

    projectAssessments,

    correlations,

    sourceCoverage,

    missingBrowsers,
    missingProfiles,
    missingProjects,
  };
}



const COMPATIBILITY_RISK_ORDER:
  Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };


function elevateCompatibilityRisk(
  current:
    RiskLevel,

  required:
    RiskLevel
): RiskLevel {

  if (
    COMPATIBILITY_RISK_ORDER[required] >
    COMPATIBILITY_RISK_ORDER[current]
  ) {
    return required;
  }

  return current;
}


export function applyCompatibilityReleaseGate(
  assessment:
    ReleaseAssessment,

  compatibility:
    CompatibilityAssessment
): ReleaseAssessment {

  /*
   * Compatibility environment presence does not equal
   * verified cross-environment comparability.
   *
   * This MUST read CompatibilityAssessment.status,
   * not ReleaseAssessment.status.
   */
  const compatibilityNotVerifiedGap =
    compatibility.status === 'not-verified'
      ? 1
      : 0;



  const blockingCompatibilityRegressions =
    compatibility.correlations.filter(
      correlation =>
        correlation.status ===
          'critical'
    ).length;


  const compatibilityGaps =
    compatibility.browserAssessments.filter(
      assessment =>
        assessment.status ===
          'not-verified'
    ).length +
    compatibility.profileAssessments.filter(
      assessment =>
        assessment.status ===
          'not-verified'
    ).length;


  if (
    blockingCompatibilityRegressions >
    0
  ) {
    return {
      ...assessment,

      status:
        'not-ready',

      risk:
        elevateCompatibilityRisk(
          assessment.risk,
          'critical'
        ),

      blockingCompatibilityRegressions,
      compatibilityGaps,

      verdict:
        assessment.verdict +
        ' Critical cross-environment compatibility regression detected.',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve critical browser or profile-specific regressions before release.',
    };
  }


  if (
    compatibility.status ===
      'poor'
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateCompatibilityRisk(
          assessment.risk,
          'high'
        ),

      blockingCompatibilityRegressions:
        0,

      compatibilityGaps,

      verdict:
        assessment.verdict +
        ' Compatibility regressions were detected across tested environments.',

      recommendedAction:
        assessment.recommendedAction +
        ' Resolve browser, profile or environment-specific regressions before release.',
    };
  }


  if (
    compatibility.status ===
      'degraded' ||
    compatibility.status ===
      'not-verified'
  ) {
    return {
      ...assessment,

      status:
        assessment.status ===
          'not-ready'
          ? 'not-ready'
          : 'ready-with-warnings',

      risk:
        elevateCompatibilityRisk(
          assessment.risk,
          'medium'
        ),

      blockingCompatibilityRegressions:
        0,

      compatibilityGaps,

      verdict:
        assessment.verdict +
        ' Compatibility verification is incomplete or uncertain.',

      recommendedAction:
        assessment.recommendedAction +
        ' Complete missing browser, profile and project compatibility coverage.',
    };
  }


  return {
    ...assessment,

    blockingCompatibilityRegressions:
      0,

    compatibilityGaps:
      Math.max(compatibilityNotVerifiedGap, 0),
  };
}
