import crypto from 'node:crypto';

import type {
  AutonomousQaActionCandidate,
  AutonomousQaAssessment,
  AutonomousQaEvidenceProvenance,
  AutonomousQaInvestigationCase,
  AutonomousQaTestSelectionCandidate,
  CaptchaQueueItem,
  DashboardRun,
  DashboardTestResult,
  HumanReviewPack,
  QualityDimension,
} from '../models/types';

function emptyProvenance(
  qualityDimensions: QualityDimension[] = []
): AutonomousQaEvidenceProvenance {
  return {
    intelligenceSources: ['test'],
    qualityDimensions,
    unifiedDecisionUnitIds: [],
    issueFingerprints: [],
    requirementIds: [],
    criticalFlowIds: [],
    flowScenarioIds: [],
  };
}

function caseId(kind: string, seed: string): string {
  return (
    `investigation-current-${kind}-` +
    crypto.createHash('sha256').update(seed).digest('hex').slice(0, 10)
  );
}

function selectionId(seed: string): string {
  return (
    'test-selection-' +
    crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12)
  );
}

function relatedTests(
  tests: DashboardTestResult[],
  match: (test: DashboardTestResult) => boolean
): DashboardTestResult[] {
  return tests.filter(match);
}

function themeCase(
  runId: string,
  finishedAt: string,
  tests: DashboardTestResult[]
): AutonomousQaInvestigationCase | undefined {
  const related = relatedTests(
    tests,
    test =>
      test.status !== 'passed' &&
      test.status !== 'skipped' &&
      /theme toggle/i.test(test.title)
  );

  if (related.length === 0) {
    return undefined;
  }

  const first = related[0];

  return {
    id: caseId('theme', first.title),
    order: 0,
    qualityDriftSignalId: 'current-run-theme',
    state: 'candidate',
    title: 'Investigate theme toggle visible change',
    signalKind: 'theme',
    signalDirection: 'changed',
    baselineRunId: runId,
    baselineFinishedAt: finishedAt,
    baselineValue: 'expected visible theme change',
    currentValue: first.error?.message ?? first.title,
    addedIds: related.map(test => test.id),
    removedIds: [],
    linkedDecisionUnitIds: [],
    linkedIssueFingerprints: [],
    hypotheses: [
      {
        text: 'The theme control is present but does not persist or apply a visible class on the document.',
        sourceUnitIds: [],
        confirmed: false,
      },
    ],
    recommendations: [
      'Developer-owned: make the toggle change html/body theme class and persist preference.',
    ],
    investigationQuestions: [
      'Does clicking Toggle theme change background and text within 5 minutes on desktop Chromium?',
      'Is the new theme still applied after a refresh?',
      'Does the failure reproduce on Firefox and WebKit or only one engine?',
      `Which file owns the control (${first.file})?`,
      'Is this a missing handler or a CSS token that never swaps?',
    ],
    investigationSteps: [
      `Open ${first.site} homepage and click Toggle theme.`,
      'Capture before/after screenshots and localStorage/theme class.',
      'Compare with tests/nation/basic-user.spec.ts.',
    ],
    exitCriteria: [
      'A reviewer can see a visible theme change, or the product bug stays machine-owned.',
      'No production write is performed by Sentinel.',
    ],
    confidence: 88,
    rootCauseConfirmed: false,
    remediationAuthorized: false,
    requiresHumanReview: true,
    provenance: emptyProvenance(['ux-ui']),
    releaseDecisionUpdateAllowed: false,
    executable: false,
  };
}

function copyCase(
  runId: string,
  finishedAt: string,
  tests: DashboardTestResult[]
): AutonomousQaInvestigationCase | undefined {
  const related = relatedTests(
    tests,
    test =>
      test.status !== 'passed' &&
      test.status !== 'skipped' &&
      (/duplicated/i.test(test.title) ||
        test.classification === 'content-bug')
  );

  if (related.length === 0) {
    return undefined;
  }

  const first = related[0];
  const quote = first.error?.message ?? first.title;

  return {
    id: caseId('copy', first.title),
    order: 0,
    qualityDriftSignalId: 'current-run-copy',
    state: 'candidate',
    title: 'Investigate duplicated or malformed homepage copy',
    signalKind: 'copy',
    signalDirection: 'changed',
    baselineRunId: runId,
    baselineFinishedAt: finishedAt,
    baselineValue: 'unique homepage sentence',
    currentValue: quote,
    addedIds: related.map(test => test.id),
    removedIds: [],
    linkedDecisionUnitIds: [],
    linkedIssueFingerprints: [],
    hypotheses: [
      {
        text: `Visible copy is duplicated or malformed. Quote from the run: ${quote.slice(0, 180)}`,
        sourceUnitIds: [],
        confirmed: false,
      },
    ],
    recommendations: [
      'Developer-owned: delete or rewrite the duplicated homepage sentence.',
    ],
    investigationQuestions: [
      'Which sentence is repeated on the Nation homepage?',
      'Is the duplicate in a CMS block, a React component, or a translation file?',
      `Does ${first.file} still fail after the copy is unique?`,
      'Does Skills catalog copy have the same issue?',
      'Can a reviewer confirm the quote in 5 minutes without re-running the matrix?',
    ],
    investigationSteps: [
      'Open https://nation.dev/ and search for the quoted sentence.',
      'Compare with tests/nation/basic-user.spec.ts.',
      'Record the exact string for the remediation report.',
    ],
    exitCriteria: [
      'Copy is unique, or the content bug stays classified for developers.',
    ],
    confidence: 95,
    rootCauseConfirmed: false,
    remediationAuthorized: false,
    requiresHumanReview: true,
    provenance: emptyProvenance(['ux-ui']),
    releaseDecisionUpdateAllowed: false,
    executable: false,
  };
}

function headerCase(
  runId: string,
  finishedAt: string,
  tests: DashboardTestResult[]
): AutonomousQaInvestigationCase | undefined {
  const related = relatedTests(
    tests,
    test =>
      test.status !== 'passed' &&
      test.status !== 'skipped' &&
      (test.classification === 'security-issue' ||
        /content-security-policy|strict-transport|x-content-type|x-frame/i.test(
          test.title
        ))
  );

  if (related.length === 0) {
    return undefined;
  }

  const sites = [...new Set(related.map(test => test.site))];

  return {
    id: caseId('header', sites.join(',')),
    order: 0,
    qualityDriftSignalId: 'current-run-header-gap',
    state: 'candidate',
    title: 'Investigate missing document security headers',
    signalKind: 'header-gap',
    signalDirection: 'changed',
    baselineRunId: runId,
    baselineFinishedAt: finishedAt,
    baselineValue: 'CSP / HSTS / X-Content-Type-Options present',
    currentValue: `${related.length} header failures`,
    addedIds: related.map(test => test.id),
    removedIds: [],
    linkedDecisionUnitIds: [],
    linkedIssueFingerprints: [],
    hypotheses: [
      {
        text: 'Document responses omit a required security header. Absence is recorded honestly, not invented.',
        sourceUnitIds: [],
        confirmed: false,
      },
    ],
    recommendations: [
      'Developer-owned: add the missing headers on the responding origin, then re-run security-headers specs.',
    ],
    investigationQuestions: [
      `Which site is missing the header (${sites.join(', ')})?`,
      'Is the gap on homepage, sign-in, or both?',
      'Does a CDN or Next.js config strip CSP?',
      'Can a curl of the document headers confirm the gap in 5 minutes?',
      'Should this stay a release warning or a blocker?',
    ],
    investigationSteps: [
      'Compare tests/nation/security-headers.spec.ts and tests/skills/security-headers.spec.ts.',
      'Capture response headers without sending production writes.',
    ],
    exitCriteria: [
      'Headers are present or the security issue remains machine-owned.',
    ],
    confidence: 90,
    rootCauseConfirmed: false,
    remediationAuthorized: false,
    requiresHumanReview: true,
    provenance: emptyProvenance(['security-performance']),
    releaseDecisionUpdateAllowed: false,
    executable: false,
  };
}

function authCase(
  runId: string,
  finishedAt: string,
  pack?: HumanReviewPack
): AutonomousQaInvestigationCase | undefined {
  if (!pack || (pack.credentials.nation && pack.credentials.aiSkills)) {
    return undefined;
  }

  const missing = pack.needsHuman.find(item => item.id === 'gap-test-account');

  if (!missing) {
    return undefined;
  }

  return {
    id: caseId('auth', 'missing-auth'),
    order: 0,
    qualityDriftSignalId: 'current-run-missing-auth',
    state: 'candidate',
    title: missing.title,
    signalKind: 'missing-auth',
    signalDirection: 'changed',
    baselineRunId: runId,
    baselineFinishedAt: finishedAt,
    baselineValue: 'NATION_TEST_* and AI_SKILLS_TEST_* present',
    currentValue: 'credentials missing',
    addedIds: ['gap-test-account'],
    removedIds: [],
    linkedDecisionUnitIds: [],
    linkedIssueFingerprints: [],
    hypotheses: [
      {
        text: 'Member routes were skipped because no disposable QA account was configured.',
        sourceUnitIds: [],
        confirmed: false,
      },
    ],
    recommendations: [
      'Add NATION_TEST_EMAIL/PASSWORD and AI_SKILLS_TEST_EMAIL/PASSWORD, then re-run qa:unattended.',
    ],
    investigationQuestions: [
      'Is a disposable QA account available for nation.dev?',
      'Is a disposable QA account available for aiskills.nation.dev?',
      'After login, do /home /jobs /profile /assessment load?',
      'Did a first-party captcha block storageState setup?',
      'Can this be confirmed in 5 minutes without exploring classified bugs?',
    ],
    investigationSteps: [
      'Fill .env with a disposable account.',
      'Re-run npm run qa:unattended.',
      'Do not use a personal production password.',
    ],
    exitCriteria: [
      'Member routes are measured, or the credential gap stays in the human pack.',
    ],
    confidence: 99,
    rootCauseConfirmed: false,
    remediationAuthorized: false,
    requiresHumanReview: true,
    provenance: emptyProvenance(['critical-flows']),
    releaseDecisionUpdateAllowed: false,
    executable: false,
  };
}

function untestedCase(
  runId: string,
  finishedAt: string,
  pack?: HumanReviewPack
): AutonomousQaInvestigationCase | undefined {
  const routes = pack?.untestedRoutes ?? [];

  if (routes.length === 0) {
    return undefined;
  }

  const sample = routes
    .slice(0, 5)
    .map(route => route.pathname)
    .join(', ');

  return {
    id: caseId('untested', sample),
    order: 0,
    qualityDriftSignalId: 'current-run-untested-route',
    state: 'candidate',
    title: `Investigate ${routes.length} untested discovered route${routes.length === 1 ? '' : 's'}`,
    signalKind: 'untested-route',
    signalDirection: 'changed',
    baselineRunId: runId,
    baselineFinishedAt: finishedAt,
    baselineValue: 'hand-written E2E for crawled routes',
    currentValue: String(routes.length),
    addedIds: routes.map(route => `${route.site}:${route.pathname}`),
    removedIds: [],
    linkedDecisionUnitIds: [],
    linkedIssueFingerprints: [],
    hypotheses: [
      {
        text: `Discovery crawled routes that have no hand-written E2E. Sample: ${sample}`,
        sourceUnitIds: [],
        confirmed: false,
      },
    ],
    recommendations: [
      'Add a focused Playwright spec for the highest-value untested route, or accept generated smoke only.',
    ],
    investigationQuestions: [
      'Which untested route is user-facing and worth a 5-minute click-through?',
      'Is the route a task template that can stay as generated smoke?',
      'Does it require login?',
      `First URL: ${routes[0]?.url ?? 'unknown'}`,
      'Should coverage live under tests/nation or tests/skills?',
    ],
    investigationSteps: [
      'Open the first untested URL.',
      'Decide handwritten vs generated-smoke-only.',
      'Do not treat generated HTTP smoke as full coverage.',
    ],
    exitCriteria: [
      'A handwritten spec exists, or the route stays listed as untested.',
    ],
    confidence: 80,
    rootCauseConfirmed: false,
    remediationAuthorized: false,
    requiresHumanReview: true,
    provenance: emptyProvenance(['requirements-functionality']),
    releaseDecisionUpdateAllowed: false,
    executable: false,
  };
}

function captchaCase(
  runId: string,
  finishedAt: string,
  queue: CaptchaQueueItem[]
): AutonomousQaInvestigationCase | undefined {
  if (queue.length === 0) {
    return undefined;
  }

  const first = queue[0];

  return {
    id: caseId('captcha', first.id),
    order: 0,
    qualityDriftSignalId: 'current-run-captcha',
    state: 'candidate',
    title: first.title,
    signalKind: 'captcha',
    signalDirection: 'changed',
    baselineRunId: runId,
    baselineFinishedAt: finishedAt,
    baselineValue: 'login without iframe captcha',
    currentValue: first.kind,
    addedIds: queue.map(item => item.id),
    removedIds: [],
    linkedDecisionUnitIds: [],
    linkedIssueFingerprints: [],
    hypotheses: [
      {
        text: 'A Google reCAPTCHA or hCaptcha iframe blocked first-party login. Cookie banners are not this item.',
        sourceUnitIds: [],
        confirmed: false,
      },
    ],
    recommendations: [
      'Human: complete the first-party login captcha, or set SENTINEL_CAPTCHA_SOLVER_KEY for their sites only.',
    ],
    investigationQuestions: [
      `Is the iframe still on ${first.url}?`,
      'Did cookie consent already dismiss?',
      'Is SENTINEL_CAPTCHA_SOLVER_KEY unset (default)?',
      'Can a human complete login in 5 minutes and refresh storageState?',
      'Was this nation.dev or aiskills.nation.dev only?',
    ],
    investigationSteps: [
      'Open the queued URL on the first-party host.',
      'Do not solve captchas on third-party sites.',
      'Re-run auth setup after a human login or opt-in solver.',
    ],
    exitCriteria: [
      'storageState exists, or the captcha item stays in the human queue.',
    ],
    confidence: 70,
    rootCauseConfirmed: false,
    remediationAuthorized: false,
    requiresHumanReview: true,
    provenance: emptyProvenance(['critical-flows']),
    releaseDecisionUpdateAllowed: false,
    executable: false,
  };
}

function candidateFromTests(
  title: string,
  file: string,
  site: string,
  reason: AutonomousQaTestSelectionCandidate['reasons'][number],
  tests: DashboardTestResult[]
): AutonomousQaTestSelectionCandidate {
  return {
    id: selectionId(`${site}|${file}|${title}`),
    logicalTestKey: `${site}|${file}|${title}`.toLowerCase(),
    title,
    fullTitle: title,
    file,
    site,
    priority: 'P2',
    disposition: 'warn',
    evidenceState: 'confirmed',
    riskEligible: true,
    confidence: 85,
    reasons: [reason, ...(tests.length ? ['failed-current-run' as const] : [])],
    variants: tests.map(test => ({
      testId: test.id,
      project: test.project,
      browserFamily: test.browserFamily,
      profile: test.profile,
      status: test.status,
    })),
    provenance: emptyProvenance(),
  };
}

export function buildCurrentRunAdvisory(input: {
  runId: string;
  finishedAt: string;
  tests: DashboardTestResult[];
  humanReview?: HumanReviewPack;
  captchaQueue?: CaptchaQueueItem[];
}): {
  cases: AutonomousQaInvestigationCase[];
  testSelectionCandidates: AutonomousQaTestSelectionCandidate[];
  actions: AutonomousQaActionCandidate[];
} {
  const cases = [
    themeCase(input.runId, input.finishedAt, input.tests),
    copyCase(input.runId, input.finishedAt, input.tests),
    headerCase(input.runId, input.finishedAt, input.tests),
    authCase(input.runId, input.finishedAt, input.humanReview),
    untestedCase(input.runId, input.finishedAt, input.humanReview),
    captchaCase(input.runId, input.finishedAt, input.captchaQueue ?? []),
  ]
    .filter((value): value is AutonomousQaInvestigationCase => Boolean(value))
    .map((investigationCase, index) => ({
      ...investigationCase,
      order: index + 1,
    }));

  const testSelectionCandidates: AutonomousQaTestSelectionCandidate[] = [];

  const themeTests = relatedTests(
    input.tests,
    test => /theme toggle/i.test(test.title)
  );
  if (themeTests.some(test => test.status !== 'passed' && test.status !== 'skipped')) {
    testSelectionCandidates.push(
      candidateFromTests(
        'theme toggle visibly changes the page theme',
        themeTests[0]?.file ?? 'tests/nation/basic-user.spec.ts',
        themeTests[0]?.site ?? 'nation',
        'current-run-finding',
        themeTests.filter(test => test.status !== 'passed')
      )
    );
  }

  const copyTests = relatedTests(
    input.tests,
    test => /duplicated/i.test(test.title) || test.classification === 'content-bug'
  );
  if (copyTests.some(test => test.status !== 'passed' && test.status !== 'skipped')) {
    testSelectionCandidates.push(
      candidateFromTests(
        copyTests[0]?.title ?? 'homepage copy',
        copyTests[0]?.file ?? 'tests/nation/basic-user.spec.ts',
        copyTests[0]?.site ?? 'nation',
        'current-run-finding',
        copyTests.filter(test => test.status !== 'passed')
      )
    );
  }

  if (input.humanReview && (!input.humanReview.credentials.nation || !input.humanReview.credentials.aiSkills)) {
    testSelectionCandidates.push(
      candidateFromTests(
        'Add test account to unlock /home /jobs /profile /assessment',
        'tests/nation/auth-session.spec.ts',
        'nation',
        'missing-auth',
        []
      )
    );
  }

  for (const route of (input.humanReview?.untestedRoutes ?? []).slice(0, 5)) {
    testSelectionCandidates.push(
      candidateFromTests(
        `Write E2E for ${route.pathname}`,
        '(no handwritten spec)',
        route.site,
        'untested-route',
        []
      )
    );
  }

  const actions: AutonomousQaActionCandidate[] = [
    ...cases.map(investigationCase => ({
      id: `action-${investigationCase.id}`,
      kind: 'investigation' as const,
      state: 'candidate' as const,
      title: investigationCase.title,
      rationale:
        'Current-run evidence produced an advisory investigation case (theme, copy, headers, auth, untested routes, or captcha). Remediation stays local reports only.',
      authority: 'advisory-only' as const,
      executable: false as const,
      confidence: investigationCase.confidence,
      provenance: investigationCase.provenance,
      investigationCaseId: investigationCase.id,
    })),
    ...testSelectionCandidates.map(candidate => ({
      id: `action-${candidate.id}`,
      kind: 'test-selection' as const,
      state: 'candidate' as const,
      title: `Prioritize ${candidate.title}`,
      rationale:
        'Risk-based task selection from latest-run evidence. No autonomous Playwright launch.',
      authority: 'advisory-only' as const,
      executable: false as const,
      confidence: candidate.confidence,
      provenance: candidate.provenance,
      testSelectionCandidateId: candidate.id,
    })),
  ];

  return { cases, testSelectionCandidates, actions };
}

export function enrichAutonomousQaFromLatestRun(
  assessment: AutonomousQaAssessment,
  run: Pick<DashboardRun, 'runId' | 'finishedAt' | 'tests' | 'humanReview'>,
  captchaQueue: CaptchaQueueItem[] = []
): AutonomousQaAssessment {
  const advisory = buildCurrentRunAdvisory({
    runId: run.runId,
    finishedAt: run.finishedAt,
    tests: run.tests ?? [],
    humanReview: run.humanReview,
    captchaQueue,
  });

  const existingCases = assessment.investigation?.cases ?? [];
  const existingIds = new Set(existingCases.map(item => item.id));
  const mergedCases = [
    ...existingCases,
    ...advisory.cases.filter(item => !existingIds.has(item.id)),
  ];

  const existingSelection = assessment.testSelection?.candidates ?? [];
  const existingKeys = new Set(
    existingSelection.map(item => item.logicalTestKey)
  );
  const mergedSelection = [
    ...existingSelection,
    ...advisory.testSelectionCandidates.filter(
      item => !existingKeys.has(item.logicalTestKey)
    ),
  ];

  const existingActionIds = new Set(
    assessment.candidateActions.map(item => item.id)
  );
  const mergedActions = [
    ...assessment.candidateActions,
    ...advisory.actions.filter(item => !existingActionIds.has(item.id)),
  ];

  const investigationStatus =
    mergedCases.length > 0
      ? 'available'
      : assessment.investigation?.status ?? 'no-signals';

  const selectionStatus =
    mergedSelection.length > 0
      ? 'available'
      : assessment.testSelection?.status ?? 'no-candidates';

  return {
    ...assessment,
    capabilityStatus:
      mergedCases.length > 0 || mergedSelection.length > 0
        ? 'investigation-planning-advisory'
        : assessment.capabilityStatus,
    candidateActions: mergedActions,
    testSelection: {
      status: selectionStatus,
      candidateCount: mergedSelection.length,
      selectedTestCount: mergedSelection.reduce(
        (total, candidate) => total + candidate.variants.length,
        0
      ),
      candidates: mergedSelection,
    },
    investigation: {
      status: investigationStatus,
      baselineRunId:
        assessment.investigation?.baselineRunId ?? run.runId,
      baselineFinishedAt:
        assessment.investigation?.baselineFinishedAt ?? run.finishedAt,
      caseCount: mergedCases.length,
      openCaseCount: mergedCases.length,
      linkedDecisionUnitCount:
        assessment.investigation?.linkedDecisionUnitCount ?? 0,
      hypothesisCount: mergedCases.reduce(
        (total, item) => total + item.hypotheses.length,
        0
      ),
      confirmedRootCauseCount: 0,
      remediationAuthorizedCount: 0,
      cases: mergedCases,
    },
    reason:
      mergedCases.length > 0
        ? 'Autonomous QA advisory filled investigation and risk-based task selection from latest-run evidence (theme, copy, headers, untested routes, missing auth, captcha). Local remediation reports may follow; production writes stay off.'
        : assessment.reason,
  };
}
