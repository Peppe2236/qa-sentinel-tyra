import { expect, test } from '@playwright/test';

import { classifyIssue } from '../../reporters/analyzers/sentinel-classifier';
import type { DashboardTestResult } from '../../reporters/models/types';
import {
  detectKeyboardTrap,
  focusKey,
  type FocusSnapshot,
} from '../helpers/keyboard-focus';

function snapshot(
  overrides: Partial<FocusSnapshot>
): FocusSnapshot {
  return {
    index: 0,
    tag: 'A',
    role: 'link',
    name: 'Join as a talent',
    id: '',
    href: '/signup',
    ...overrides,
  };
}

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 'kbd-1',
    title: 'homepage tab order reaches the first controls without a keyboard trap',
    fullTitle: 'homepage tab order',
    status: 'failed',
    duration: 100,
    retries: 0,
    project: 'nation-chromium',
    file: 'tests/nation/keyboard-a11y.spec.ts',
    line: 1,
    tags: [],
    annotations: [],
    errors: [],
    attachments: [],
    category: 'accessibility',
    ...overrides,
  } as DashboardTestResult;
}

test.describe('keyboard focus helpers', () => {
  test('three identical in-page stops are a trap', () => {
    const trapped = detectKeyboardTrap([
      snapshot({ index: 0 }),
      snapshot({ index: 1 }),
      snapshot({ index: 2 }),
    ]);

    expect(trapped.trapped).toBe(true);
    expect(trapped.label).toMatch(/talent/i);
  });

  test('moving between controls is not a trap', () => {
    const moving = detectKeyboardTrap([
      snapshot({ name: 'Skip' }),
      snapshot({ name: 'Join as a talent' }),
      snapshot({ name: 'Join as an organization', href: '/org' }),
    ]);

    expect(moving.trapped).toBe(false);
  });

  test('staying on BODY is not a trap', () => {
    const body = snapshot({ tag: 'BODY', name: '', href: '', role: '' });

    expect(
      detectKeyboardTrap([body, body, body]).trapped
    ).toBe(false);
  });

  test('focus keys distinguish hrefs', () => {
    expect(
      focusKey(snapshot({ href: '/a' }))
    ).not.toBe(focusKey(snapshot({ href: '/b' })));
  });

  test('keyboard failures classify as accessibility issues', () => {
    const classified = classifyIssue(
      sampleTest({
        error: {
          message: 'Keyboard trap on Toggle theme after Tab',
        },
      })
    );

    expect(classified.classification).toBe('accessibility-issue');
    expect(classified.reason).toMatch(/keyboard|focus|trap/i);
  });
});
