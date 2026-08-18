import { expect, test } from '@playwright/test';

import { classifyIssue } from '../../reporters/analyzers/sentinel-classifier';
import type { DashboardTestResult } from '../../reporters/models/types';
import {
  axeFailSeverity,
  classifyAxeViolations,
  formatAxeViolations,
} from '../../reporters/utils/axe-classification';

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 'a11y-1',
    title: 'homepage axe-core serious and critical findings',
    fullTitle: 'homepage axe-core serious and critical findings',
    status: 'failed',
    duration: 100,
    retries: 0,
    project: 'nation-chromium',
    file: 'tests/nation/accessibility.spec.ts',
    line: 1,
    tags: [],
    annotations: [],
    errors: [],
    attachments: [],
    category: 'accessibility',
    ...overrides,
  } as DashboardTestResult;
}

test.describe('axe-core classification', () => {
  test('serious and critical become failing issues', () => {
    const classified = classifyAxeViolations([
      { id: 'button-name', impact: 'critical', help: 'Buttons must have a name' },
      { id: 'label', impact: 'serious', help: 'Form labels' },
      { id: 'region', impact: 'moderate', help: 'Landmark region' },
      { id: 'html-has-lang', impact: 'minor', help: 'html lang' },
    ]);

    expect(classified.failing.map(item => item.id)).toEqual([
      'button-name',
      'label',
    ]);
    expect(classified.warnings.map(item => item.id)).toEqual(['region']);
    expect(classified.ignored.map(item => item.id)).toEqual(['html-has-lang']);
    expect(axeFailSeverity(classified.failing)).toBe('high');
  });

  test('color-contrast is logged as a warning even when axe rates it serious', () => {
    const classified = classifyAxeViolations([
      {
        id: 'color-contrast',
        impact: 'serious',
        help: 'Elements must have sufficient color contrast',
      },
    ]);

    expect(classified.failing).toEqual([]);
    expect(classified.warnings).toHaveLength(1);
    expect(classified.warnings[0].id).toBe('color-contrast');
  });

  test('formats violation evidence without inventing extra issues', () => {
    const text = formatAxeViolations(
      [
        {
          id: 'button-name',
          impact: 'serious',
          help: 'Buttons must have discernible text',
          nodes: [{ target: ['button.theme'] }],
        },
      ],
      'Serious/critical axe findings'
    );

    expect(text).toMatch(/button-name/);
    expect(text).toMatch(/serious/);
    expect(text).toMatch(/button\.theme/);
  });

  test('classifies axe failures as accessibility-issue', () => {
    const classified = classifyIssue(
      sampleTest({
        error: {
          message: 'Serious/critical axe findings (1): - button-name (critical)',
        },
      })
    );

    expect(classified.classification).toBe('accessibility-issue');
  });
});
