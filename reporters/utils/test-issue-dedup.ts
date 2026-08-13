import type {
  DashboardTestResult,
} from '../models/types';


export interface ActionableTestIssue {
  source: 'test';

  fingerprint: string;

  title: string;
  rootSymptom: string;

  file: string;
  line: number;

  site: string;

  severity:
    DashboardTestResult['severity'];

  category:
    DashboardTestResult['category'];

  qualityDimensions?:
    DashboardTestResult['qualityDimensions'];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];

  criticalFlows?:
    string[];


  classification?:
    DashboardTestResult['classification'];

  classificationReason?: string;

  occurrences: number;

  affectedProjects: string[];
  affectedBrowsers: string[];
  affectedProfiles: string[];
  affectedSites: string[];

  sourceTestIds: string[];

  rootCause?: string;
  confidence?: number;
  recommendation?: string;
  userImpact?: string;

  errorMessage?: string;
  errorSnippet?: string;

  flowScenarioIds?:
    string[];
}


function unique(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}


function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()

    /*
     * Remove values that commonly differ
     * between browsers/runs but do not
     * represent a different root symptom.
     */
    .replace(
      /https?:\/\/\S+/g,
      '<url>'
    )
    .replace(
      /\b\d+(?:\.\d+)?ms\b/g,
      '<duration>'
    )
    .replace(
      /\b\d+(?:\.\d+)?\b/g,
      '<number>'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function stripAnsi(
  value: string
): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-?]*[ -/]*[@-~]/g,
    ''
  );
}

function extractRootSymptom(
  test: DashboardTestResult
): string {
 const message =
  test.error?.message
    ? stripAnsi(
        test.error.message
      )
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean)
    : undefined;

  if (message) {
    return message;
  }

  const snippet =
  test.error?.snippet
    ? stripAnsi(
        test.error.snippet
      )
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean)
    : undefined;

  if (snippet) {
    return snippet;
  }

  return test.title;
}


function hashString(
  value: string
): string {
  let hash =
    2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(index);

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    hash >>> 0
  )
    .toString(16)
    .padStart(
      8,
      '0'
    );
}


function createFingerprint(
  test: DashboardTestResult,
  rootSymptom: string
): string {
  /*
   * Project/browser are deliberately NOT
   * included here.
   *
   * The same defect reproduced in Chrome,
   * Firefox, WebKit, mobile and tablet
   * should remain one actionable issue.
   */
  return hashString(
    [
      test.site,
      test.file,
      test.line,
      test.title,
      normalizeText(
        rootSymptom
      ),
    ].join('|')
  );

  function stripAnsi(
  value: string
): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-?]*[ -/]*[@-~]/g,
    ''
  );
}
}


export function consolidateTestIssues(
  tests: DashboardTestResult[]
): ActionableTestIssue[] {
  const failedTests =
    tests.filter(test =>
      [
        'failed',
        'timedOut',
        'interrupted',
      ].includes(
        test.status
      )
    );

  const issueMap =
    new Map<
      string,
      ActionableTestIssue
    >();

  for (
    const test of failedTests
  ) {
    const rootSymptom =
      extractRootSymptom(
        test
      );

    const fingerprint =
      createFingerprint(
        test,
        rootSymptom
      );

    const existing =
      issueMap.get(
        fingerprint
      );

    if (existing) {
      existing.occurrences += 1;

      existing.affectedProjects =
        unique([
          ...existing.affectedProjects,
          test.project,
        ]);

      existing.affectedBrowsers =
        unique([
          ...existing.affectedBrowsers,
          test.browserFamily,
        ]);

        existing.affectedProfiles =
  unique([
    ...existing.affectedProfiles,
    test.profile,
  ]);

      existing.affectedSites =
        unique([
          ...existing.affectedSites,
          test.site,
        ]);

      existing.sourceTestIds =
        unique([
          ...existing.sourceTestIds,
          test.id,
        ]);

      continue;
    }

    issueMap.set(
      fingerprint,
      {
        source:
          'test',

        fingerprint,

        title:
          test.title,

        rootSymptom,

        file:
          test.file,

        line:
          test.line,

        site:
          test.site,

        severity:
          test.severity,

        category:
          test.category,

        classification:
          test.classification,

        classificationReason:
          test.classificationReason,

        occurrences:
          1,

        affectedProjects: [
          test.project,
        ],

        affectedBrowsers: [
          test.browserFamily,
        ],
        affectedProfiles: [
          test.profile,
        ],

        affectedSites: [
          test.site,
        ],

        sourceTestIds: [
          test.id,
        ],

        rootCause:
          test.rootCause,

        confidence:
          test.confidence,

        recommendation:
          test.recommendation,

        userImpact:
          test.userImpact,

        errorMessage:
  test.error?.message
    ? stripAnsi(
        test.error.message
      )
    : undefined,

errorSnippet:
  test.error?.snippet
    ? stripAnsi(
        test.error.snippet
      )
    : undefined,
      }
    );
  }

  return [
    ...issueMap.values(),
  ].sort(
    (a, b) =>
      b.occurrences -
      a.occurrences
  );
}