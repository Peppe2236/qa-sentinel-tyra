import { expect, test } from '@playwright/test';

import {
  qualityMeta,
} from '../helpers/quality';
import {
  countFocusable,
  detectKeyboardTrap,
  KEYBOARD_TAB_LIMIT,
  tabFocusSequence,
} from '../helpers/keyboard-focus';
import { NationHomePage } from '../pages/nation-home.page';

test.describe('Nation homepage keyboard accessibility', () => {
  test(
    'homepage tab order reaches the first controls without a keyboard trap',
    qualityMeta({
      requirement: 'REQ-NATION-A11Y-001',
      criteria: 'AC-NATION-A11Y-001-KEYBOARD',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-KEYBOARD',
      category: 'accessibility',
      dimensions: 'ux-ui',
      severity: 'high',
    }),
    async ({ page }) => {
      const home = new NationHomePage(page);

      await home.goto();

      const focusable = await countFocusable(page);

      expect(
        focusable,
        'Homepage has no keyboard-focusable controls'
      ).toBeGreaterThan(2);

      const sequence = await tabFocusSequence(page, KEYBOARD_TAB_LIMIT);
      const trap = detectKeyboardTrap(sequence);
      const distinct = new Set(
        sequence
          .filter(item => item.tag !== 'BODY' && item.tag !== 'HTML')
          .map(item => `${item.tag}|${item.id}|${item.name}`)
      );

      expect(
        trap.trapped,
        `Keyboard trap on ${trap.label ?? 'unknown control'} after Tab`
      ).toBe(false);

      expect(
        distinct.size,
        `Tab only reached ${distinct.size} in-page control(s) in the first ${KEYBOARD_TAB_LIMIT} stops`
      ).toBeGreaterThan(1);
    }
  );
});
