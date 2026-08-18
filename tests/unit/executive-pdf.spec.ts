import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeExecutivePdf } from '../../reporters/utils/executive-pdf';
import type { HumanReviewPack } from '../../reporters/models/types';

test.describe('executive PDF', () => {
  test('writes reports/executive-report.pdf from a short pack', async () => {
    const pack: HumanReviewPack = {
      verdict: 'WARN',
      bullets: [
        '1 product bug already classified (theme toggle).',
        '1 content bug already classified (duplicated copy).',
        '2 security-header failures recorded honestly.',
      ],
      generatedAt: '2026-08-18T12:00:00.000Z',
      runId: 'pdf-unit',
      credentials: { nation: false, aiSkills: false },
      machineOwned: [
        {
          id: 'theme',
          classification: 'product-bug',
          title: 'theme toggle visibly changes the page theme',
          site: 'nation',
          file: 'tests/nation/basic-user.spec.ts',
          route: '/',
          rootCause: 'Theme toggle does not apply a visible class on html.',
        },
      ],
      needsHuman: [
        {
          id: 'gap-test-account',
          site: 'nation + ai-skills',
          url: 'https://nation.dev/home',
          title: 'Add test account to unlock /home /jobs /profile /assessment',
          whyHuman: 'No NATION_TEST_* credentials.',
          suggestedCheck: 'Add a disposable QA account.',
        },
      ],
      untestedRoutes: [],
      rootCauseNotes: [
        {
          id: 'theme',
          title: 'theme toggle visibly changes the page theme',
          site: 'nation',
          file: 'tests/nation/basic-user.spec.ts',
          route: '/',
          theme: 'theme',
          engine: 'heuristic',
          summary: 'Theme toggle click does not apply a visible class.',
          evidence: 'no visible theme state changed',
          recommendation: 'Toggle html.dark on click.',
          confidence: 'high',
        },
      ],
    };

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-pdf-'));
    const filePath = await writeExecutivePdf({
      pack,
      run: {
        runId: pack.runId,
        finishedAt: pack.generatedAt,
        health: 89,
        totalTests: 12,
        passed: 9,
        failed: 2,
        skipped: 1,
        releaseAssessment: {
          status: 'ready-with-warnings',
          risk: 'medium',
          confidence: 70,
          blockingIssues: 1,
          nonBlockingIssues: 2,
          verdict: 'Fixture PDF',
          recommendedAction: 'Read the human pack',
        },
        projects: [
          {
            id: 'nation',
            name: 'Nation',
            host: 'nation.dev',
            site: 'nation',
            baseURL: 'https://nation.dev/',
            total: 8,
            passed: 6,
            failed: 1,
            skipped: 1,
            health: 86,
            passRate: 86,
          },
        ],
        rootCauseNotes: pack.rootCauseNotes,
        humanReview: pack,
      },
      reportsDirectory: directory,
    });

    expect(path.basename(filePath)).toBe('executive-report.pdf');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.statSync(filePath).size).toBeGreaterThan(400);
  });
});
