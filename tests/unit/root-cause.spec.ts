import { expect, test } from '@playwright/test';

import {
  attachRootCauseNotesToPack,
  buildHeuristicRootCauseNotes,
  classifyRootCauseTheme,
  heuristicRootCauseSummary,
} from '../../reporters/utils/root-cause';
import type { HumanReviewPack } from '../../reporters/models/types';

test.describe('heuristic root-cause intelligence', () => {
  test('classifies theme, copy and header failures', () => {
    expect(
      classifyRootCauseTheme('theme toggle visibly changes the page theme', 'product-bug')
    ).toBe('theme');
    expect(
      classifyRootCauseTheme(
        'homepage does not contain duplicated skills wording',
        'content-bug'
      )
    ).toBe('copy');
    expect(
      classifyRootCauseTheme(
        'catalog document includes Content-Security-Policy',
        'security-issue'
      )
    ).toBe('headers');
  });

  test('writes a Root cause note without an LLM key', () => {
    const notes = buildHeuristicRootCauseNotes({
      tests: [
        {
          id: 'theme',
          title: 'theme toggle visibly changes the page theme',
          fullTitle: 'theme toggle',
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
          severity: 'high',
          category: 'ui',
          vitalRank: 2,
          tags: [],
          annotations: [],
          attachments: [],
          classification: 'product-bug',
        },
      ],
    });

    expect(notes[0]?.theme).toBe('theme');
    expect(notes[0]?.engine).toBe('heuristic');
    expect(notes[0]?.summary).toMatch(/theme/i);
    expect(
      heuristicRootCauseSummary({
        title: 'homepage document includes Content-Security-Policy',
        classification: 'security-issue',
      })
    ).toMatch(/header/i);
  });

  test('attaches Root cause notes to the human-review pack', () => {
    const pack: HumanReviewPack = {
      verdict: 'NO-GO',
      bullets: ['a', 'b', 'c'],
      generatedAt: '2026-08-18T12:00:00.000Z',
      runId: 'root-cause',
      credentials: { nation: false, aiSkills: false },
      machineOwned: [
        {
          id: 'copy',
          classification: 'content-bug',
          title: 'homepage does not contain duplicated skills wording',
          site: 'nation',
          file: 'tests/nation/basic-user.spec.ts',
          route: '/',
        },
      ],
      needsHuman: [],
      untestedRoutes: [],
    };

    const next = attachRootCauseNotesToPack(pack);
    expect(next.rootCauseNotes?.some(note => note.theme === 'copy')).toBe(true);
    expect(next.machineOwned[0]?.rootCause).toMatch(/copy|duplicated/i);
  });
});
