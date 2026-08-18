import { expect, test } from '@playwright/test';

import { classifyCaptchaEvidence } from '../../config/first-party';
import { snapshotQaPolicy } from '../../config/policy';
import { buildCurrentRunAdvisory } from '../../reporters/analyzers/sentinel-autonomous-advisory';
import type { DashboardTestResult, HumanReviewPack } from '../../reporters/models/types';
import { classifySentinelWorkItem } from '../../reporters/utils/sentinel-work-classification';
import { buildRemediationSuggestions } from '../../reporters/utils/remediation';

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 't1',
    title: 'sample',
    fullTitle: 'sample',
    file: 'tests/nation/basic-user.spec.ts',
    line: 1,
    column: 1,
    project: 'nation-chromium',
    site: 'nation',
    browserFamily: 'Chromium',
    profile: 'Desktop',
    status: 'failed',
    expectedStatus: 'passed',
    duration: 10,
    retry: 0,
    severity: 'medium',
    category: 'ui',
    vitalRank: 3,
    tags: [],
    annotations: [],
    attachments: [],
    ...overrides,
  };
}

const pack: HumanReviewPack = {
  verdict: 'NO-GO',
  bullets: ['theme', 'copy', 'headers'],
  generatedAt: '2026-08-18T12:00:00.000Z',
  runId: 'run-1',
  credentials: { nation: false, aiSkills: false },
  machineOwned: [
    {
      id: 'theme',
      classification: 'product-bug',
      title: 'theme toggle visibly changes the page theme',
      site: 'nation',
      file: 'tests/nation/basic-user.spec.ts',
      route: '/',
    },
    {
      id: 'copy',
      classification: 'content-bug',
      title: 'homepage does not contain duplicated skills wording',
      site: 'nation',
      file: 'tests/nation/basic-user.spec.ts',
      route: '/',
    },
    {
      id: 'csp',
      classification: 'security-issue',
      title: 'homepage document has a Content-Security-Policy header',
      site: 'nation',
      file: 'tests/nation/security-headers.spec.ts',
      route: '/',
    },
  ],
  needsHuman: [
    {
      id: 'gap-test-account',
      site: 'nation + ai-skills',
      url: 'https://nation.dev/home',
      title: 'Add test account to unlock /home /jobs /profile /assessment',
      whyHuman: 'No credentials',
      suggestedCheck: 'Add .env account',
    },
  ],
  untestedRoutes: [
    {
      site: 'ai-skills',
      pathname: '/skills/gamma/tasks/gamma-leadership-update-deck',
      url: 'https://aiskills.nation.dev/skills/gamma/tasks/gamma-leadership-update-deck',
    },
  ],
};

test.describe('sentinel work classification', () => {
  test('theme, copy, and header gaps are remediation', () => {
    expect(
      classifySentinelWorkItem({
        classification: 'product-bug',
        title: 'theme toggle visibly changes the page theme',
      })
    ).toBe('remediation');

    expect(
      classifySentinelWorkItem({
        classification: 'content-bug',
        title: 'homepage does not contain duplicated skills wording',
      })
    ).toBe('remediation');

    expect(
      classifySentinelWorkItem({
        classification: 'security-issue',
        title: 'homepage document has a Content-Security-Policy header',
      })
    ).toBe('remediation');
  });

  test('untested routes and missing auth stay advisory', () => {
    expect(
      classifySentinelWorkItem({
        title: 'Write E2E for /skills/gamma/tasks/gamma-leadership-update-deck',
        source: 'untested-route',
      })
    ).toBe('advisory');

    expect(
      classifySentinelWorkItem({
        title: 'Add test account to unlock /home /jobs /profile /assessment',
      })
    ).toBe('advisory');
  });

  test('iframe recaptcha/hcaptcha is human-captcha', () => {
    expect(
      classifySentinelWorkItem({
        captchaKind: 'recaptcha',
        title: 'Human captcha on first-party login',
      })
    ).toBe('human-captcha');

    expect(
      classifySentinelWorkItem({
        source: 'human-captcha',
        title: 'hCaptcha blocked nation.dev sign-in',
      })
    ).toBe('human-captcha');
  });

  test('missing LLM key is llm-skipped', () => {
    expect(
      classifySentinelWorkItem({
        llmStatus: 'off-no-key',
        title: 'Rewrite three-bullet verdict',
      })
    ).toBe('llm-skipped');
  });
});

test.describe('current-run advisory from latest-run evidence', () => {
  test('fills investigation and risk-based task selection from theme, copy, untested routes, and missing auth', () => {
    const advisory = buildCurrentRunAdvisory({
      runId: 'run-1',
      finishedAt: '2026-08-18T12:00:00.000Z',
      tests: [
        sampleTest({
          id: 'theme-1',
          title: 'theme toggle visibly changes the page theme',
          classification: 'product-bug',
          error: { message: 'no visible or stored theme state changed' },
        }),
        sampleTest({
          id: 'copy-1',
          title: 'homepage does not contain duplicated skills wording',
          classification: 'content-bug',
          error: { message: 'Possible duplicated or malformed homepage sentence found' },
        }),
        sampleTest({
          id: 'csp-1',
          title: 'homepage document has a Content-Security-Policy header',
          classification: 'security-issue',
          file: 'tests/nation/security-headers.spec.ts',
        }),
      ],
      humanReview: pack,
    });

    const kinds = advisory.cases.map(item => item.signalKind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        'theme',
        'copy',
        'header-gap',
        'missing-auth',
        'untested-route',
      ])
    );

    expect(
      advisory.cases.find(item => item.signalKind === 'theme')
        ?.investigationQuestions.length
    ).toBeGreaterThanOrEqual(5);

    const reasons = advisory.testSelectionCandidates.flatMap(
      item => item.reasons
    );
    expect(reasons).toEqual(
      expect.arrayContaining([
        'current-run-finding',
        'missing-auth',
        'untested-route',
      ])
    );
  });

  test('remediation suggestions quote copy, theme, and header gaps for developers', () => {
    const items = buildRemediationSuggestions(pack);

    expect(items.map(item => item.kind)).toEqual(
      expect.arrayContaining(['theme-toggle', 'copy-bug', 'header-gap'])
    );
    expect(items.every(item => item.owner === 'developer')).toBe(true);
    expect(items.every(item => item.workKind === 'remediation')).toBe(true);
  });
});

test.describe('first-party captcha policy', () => {
  test('consent and native checkbox stay first-party; iframe captcha is queued without a solver key', () => {
    expect(
      classifyCaptchaEvidence({
        url: 'https://nation.dev/signin',
        hasConsentButton: true,
      })
    ).toBe('consent');

    expect(
      classifyCaptchaEvidence({
        url: 'https://aiskills.nation.dev/signin',
        hasNativeCheckbox: true,
      })
    ).toBe('native-checkbox');

    expect(
      classifyCaptchaEvidence({
        url: 'https://nation.dev/signin',
        iframeSrcs: ['https://www.google.com/recaptcha/api2/anchor'],
      })
    ).toBe('recaptcha');

    expect(
      classifyCaptchaEvidence({
        url: 'https://example.com/login',
        iframeSrcs: ['https://www.google.com/recaptcha/api2/anchor'],
      })
    ).toBe('third-party-blocked');

    const policy = snapshotQaPolicy({});
    expect(policy.captchaClick).toBe('first-party-consent');
    expect(policy.flags.SENTINEL_CAPTCHA_SOLVER_KEY).toBe(false);
    expect(policy.productionWrites).toBe('disabled-by-policy');
  });

  test('solver key only opts in on first-party hosts', () => {
    const policy = snapshotQaPolicy({
      SENTINEL_CAPTCHA_SOLVER_KEY: 'test-key',
    });

    expect(policy.captchaClick).toBe('solver-opt-in');
    expect(policy.flags.QA_CLICK_CAPTCHA).toBe(true);
  });
});
