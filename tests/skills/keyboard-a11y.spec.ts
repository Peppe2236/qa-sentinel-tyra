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
import { SkillsCatalogPage } from '../pages/skills-catalog.page';

test.describe('AI Skills catalog keyboard accessibility', () => {
  test(
    'catalog tab order reaches the first controls without a keyboard trap',
    qualityMeta({
      requirement: 'REQ-SKILLS-A11Y-001',
      criteria: 'AC-SKILLS-A11Y-001-KEYBOARD',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-KEYBOARD',
      category: 'accessibility',
      dimensions: 'ux-ui',
      severity: 'high',
    }),
    async ({ page }) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();

      const focusable = await countFocusable(page);

      expect(
        focusable,
        'Catalog has no keyboard-focusable controls'
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
