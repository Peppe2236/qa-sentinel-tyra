import { expect, test } from '@playwright/test';

import {
  applyAccessibilityPreferences,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  normalizeAccessibilityPreferences,
} from '../../dashboard/accessibility-preferences.mjs';

test.describe('dashboard accessibility preferences', () => {
  test('uses safe defaults for unknown stored values', () => {
    expect(
      normalizeAccessibilityPreferences({
        visionMode: 'invented-mode',
        textSize: 'huge',
        reduceMotion: 'true',
        emphasizeLinks: 1,
      })
    ).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES);
  });

  test('accepts supported visual accessibility preferences', () => {
    expect(
      normalizeAccessibilityPreferences({
        visionMode: 'red-green',
        textSize: 'extra-large',
        reduceMotion: true,
        emphasizeLinks: true,
      })
    ).toEqual({
      visionMode: 'red-green',
      textSize: 'extra-large',
      reduceMotion: true,
      emphasizeLinks: true,
    });
  });

  test('applies preferences only as presentation data attributes', () => {
    const root = { dataset: {} };

    applyAccessibilityPreferences(
      {
        visionMode: 'high-contrast',
        textSize: 'large',
        reduceMotion: true,
        emphasizeLinks: true,
      },
      root
    );

    expect(root.dataset).toEqual({
      visionMode: 'high-contrast',
      textSize: 'large',
      reduceMotion: 'true',
      emphasizeLinks: 'true',
    });
  });
});
