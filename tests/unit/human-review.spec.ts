import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { classifyIssue } from '../../reporters/analyzers/sentinel-classifier';
import type { DashboardTestResult } from '../../reporters/models/types';
import {
  bucketTestResult,
  buildHumanReviewPack,
} from '../../reporters/utils/human-review';
import {
  buildHumanReviewHtml,
  writeHumanReviewReports,
} from '../../reporters/utils/human-review-report';

const fixturePath = path.resolve(
  __dirname,
  'fixtures',
  'latest-run.human-review.json'
);

function fixtureRun() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
    runId: string;
    finishedAt: string;
    releaseAssessment: { status: string };
    tests: DashboardTestResult[];
  };
}

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 't1',
    title: 'sample',
    fullTitle: 'sample',
    file: 'tests/nation/homepage.spec.ts',
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

test.describe('human review ownership', () => {
  test('theme toggle is a machine-owned product bug, not a human explore item', () => {
    const result = sampleTest({
      title: 'theme toggle visibly changes the page theme',
      error: { message: 'no visible or stored theme state changed' },
    });
    const classified = classifyIssue(result);
    result.classification = classified.classification;

    expect(classified.classification).toBe('product-bug');
    expect(bucketTestResult(result)).toBe('machine-owned');
  });

  test('duplicated skills wording is a machine-owned content bug', () => {
    const result = sampleTest({
      title: 'homepage does not contain duplicated skills wording',
      error: { message: 'Possible duplicated or malformed homepage sentence found' },
    });
    const classified = classifyIssue(result);
    result.classification = classified.classification;

    expect(classified.classification).toBe('content-bug');
    expect(bucketTestResult(result)).toBe('machine-owned');
  });

  test('CSP analytics is a warning and is not a human fire drill', () => {
    const result = sampleTest({
      title: 'analytics collect is blocked',
      error: {
        message:
          "Connecting to Google Analytics violates Content Security Policy",
      },
    });
    const classified = classifyIssue(result);
    result.classification = classified.classification;

    expect(classified.classification).toBe('warning');
    expect(bucketTestResult(result)).toBe('ignore');
  });

  test('header failures and serious axe findings stay machine-owned', () => {
    const header = sampleTest({
      title: 'homepage document has a Content-Security-Policy header',
      category: 'security',
      error: { message: 'content-security-policy header was not present' },
    });
    header.classification = classifyIssue(header).classification;

    const axe = sampleTest({
      title: 'Nation homepage axe-core smoke has no serious or critical findings',
      category: 'accessibility',
      error: { message: 'serious/critical axe findings' },
    });
    axe.classification = classifyIssue(axe).classification;

    expect(header.classification).toBe('security-issue');
    expect(axe.classification).toBe('accessibility-issue');
    expect(bucketTestResult(header)).toBe('machine-owned');
    expect(bucketTestResult(axe)).toBe('machine-owned');
  });

  test('ambiguous sidebar failure needs a human', () => {
    const result = sampleTest({
      title: 'sidebar button changes visible layout',
      error: { message: 'sidebar state did not change' },
    });
    const classified = classifyIssue(result);
    result.classification = classified.classification;

    expect(classified.classification).toBe('needs-investigation');
    expect(bucketTestResult(result)).toBe('needs-human');
  });

  test('skipped tests are not dumped into the human queue as failures', () => {
    const result = sampleTest({
      title: 'authenticated session can open /home',
      status: 'skipped',
    });
    const classified = classifyIssue(result);
    result.classification = classified.classification;

    expect(classified.classification).toBe('none');
    expect(bucketTestResult(result)).toBe('ignore');
  });
});

test.describe('human review pack from fixture latest-run', () => {
  test('builds a 30-second pack with machine-owned vs needs-human split', () => {
    const run = fixtureRun();
    const pack = buildHumanReviewPack(run, {
      credentials: { nation: false, aiSkills: false },
      discoveredRoutes: [
        { site: 'nation', pathname: '/', url: 'https://nation.dev/' },
        { site: 'nation', pathname: '/home', url: 'https://nation.dev/home' },
        {
          site: 'ai-skills',
          pathname: '/skills/gamma/tasks/gamma-leadership-update-deck',
          url: 'https://aiskills.nation.dev/skills/gamma/tasks/gamma-leadership-update-deck',
        },
      ],
      now: '2026-08-18T12:00:00.000Z',
    });

    expect(pack.verdict).toBe('NO-GO');
    expect(pack.bullets).toHaveLength(3);

    const machineTitles = pack.machineOwned.map(item => item.title);
    expect(machineTitles).toContain(
      'theme toggle visibly changes the page theme'
    );
    expect(machineTitles).toContain(
      'homepage does not contain duplicated skills wording'
    );
    expect(machineTitles).toContain(
      'homepage document has a Content-Security-Policy header'
    );
    expect(machineTitles).toContain(
      'Nation homepage axe-core smoke has no serious or critical findings'
    );
    expect(machineTitles.join(' ')).not.toMatch(/Google Analytics/i);
    expect(machineTitles.join(' ')).not.toMatch(/sidebar/i);

    expect(pack.needsHuman.length).toBeLessThanOrEqual(7);
    expect(pack.needsHuman[0]?.title).toBe(
      'Add test account to unlock /home /jobs /profile /assessment'
    );
    expect(pack.needsHuman.some(item => item.title.includes('sidebar'))).toBe(
      true
    );

    expect(pack.untestedRoutes.map(item => item.pathname)).toEqual([
      '/skills/gamma/tasks/gamma-leadership-update-deck',
    ]);
    expect(
      pack.untestedRoutes.find(item => item.pathname === '/')
    ).toBeUndefined();
    expect(
      pack.untestedRoutes.find(item => item.pathname === '/home')
    ).toBeUndefined();
  });

  test('does not ask for a test account when both env pairs are present', () => {
    const run = fixtureRun();
    run.tests = run.tests.filter(test => test.status !== 'skipped');

    const pack = buildHumanReviewPack(run, {
      credentials: { nation: true, aiSkills: true },
      discoveredRoutes: [],
    });

    expect(
      pack.needsHuman.some(item =>
        item.title.includes('Add test account')
      )
    ).toBe(false);
  });

  test('writes HTML and markdown from the fixture run', () => {
    const run = fixtureRun();
    const pack = buildHumanReviewPack(run, {
      credentials: { nation: false, aiSkills: false },
      discoveredRoutes: [
        {
          site: 'ai-skills',
          pathname: '/skills/claude/tasks/claude-workflow-refinement',
          url: 'https://aiskills.nation.dev/skills/claude/tasks/claude-workflow-refinement',
        },
      ],
    });
    const html = buildHumanReviewHtml(pack);

    expect(html).toContain('NO-GO');
    expect(html).toContain('Do not touch');
    expect(html).toContain('Needs a human');
    expect(html).toContain('theme toggle');
    expect(html).toContain('Add test account to unlock');
    expect(html).toContain('../test-results/sidebar/error-context.md');

    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'human-review-')
    );
    const written = writeHumanReviewReports(pack, directory);

    expect(fs.existsSync(written.html)).toBe(true);
    expect(fs.existsSync(written.markdown)).toBe(true);
    expect(fs.readFileSync(written.markdown, 'utf8')).toContain(
      'Human review pack — NO-GO'
    );
  });
});
