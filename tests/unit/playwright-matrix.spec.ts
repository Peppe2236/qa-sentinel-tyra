import { expect, test } from '@playwright/test';

import playwrightConfig from '../../playwright.config';
import { SENTINEL_SITES } from '../../config/sites';
import {
  allPlaywrightProjectNames,
  DAILY_CHROMIUM_PROJECTS,
  EDGE_MATRIX_NOTE,
  PLAYWRIGHT_PROJECT_COUNT,
  playwrightProjectName,
} from '../../config/playwright-matrix';
import {
  resolveBrowserFamily,
  resolveProfile,
} from '../../reporters/utils/execution-environment';

test.describe('Playwright browser × device matrix', () => {
  test('defines 18 projects for both sites × 3 browsers × 3 form factors', () => {
    const names = allPlaywrightProjectNames();

    expect(PLAYWRIGHT_PROJECT_COUNT).toBe(18);
    expect(names).toHaveLength(18);
    expect(names).toEqual([
      'nation-chromium',
      'nation-chromium-tablet',
      'nation-chromium-mobile',
      'nation-firefox-desktop',
      'nation-firefox-tablet',
      'nation-firefox-mobile',
      'nation-webkit-desktop',
      'nation-webkit-tablet',
      'nation-webkit-mobile',
      'ai-skills-chromium',
      'ai-skills-chromium-tablet',
      'ai-skills-chromium-mobile',
      'ai-skills-firefox-desktop',
      'ai-skills-firefox-tablet',
      'ai-skills-firefox-mobile',
      'ai-skills-webkit-desktop',
      'ai-skills-webkit-tablet',
      'ai-skills-webkit-mobile',
    ]);
    expect(DAILY_CHROMIUM_PROJECTS).toEqual([
      'nation-chromium',
      'ai-skills-chromium',
    ]);
    expect(SENTINEL_SITES.map(site => site.id)).toEqual([
      'nation',
      'ai-skills',
    ]);
    expect(EDGE_MATRIX_NOTE).toMatch(/Chromium covers the Edge/i);
    expect((playwrightConfig.projects ?? []).map(project => project.name)).toEqual(
      names
    );
  });

  test('keeps daily Chromium names so qa:sites does not change', () => {
    expect(playwrightProjectName('nation', 'chromium', 'desktop')).toBe(
      'nation-chromium'
    );
    expect(playwrightProjectName('ai-skills', 'chromium', 'desktop')).toBe(
      'ai-skills-chromium'
    );
  });

  test('resolves browser family and Desktop/Tablet/Mobile from project names', () => {
    expect(resolveBrowserFamily('nation-chromium')).toBe('Chromium');
    expect(resolveProfile('nation-chromium')).toBe('Desktop');

    expect(resolveBrowserFamily('nation-firefox-desktop')).toBe('Firefox');
    expect(resolveProfile('nation-firefox-desktop')).toBe('Desktop');

    expect(resolveBrowserFamily('ai-skills-webkit-tablet')).toBe('WebKit');
    expect(resolveProfile('ai-skills-webkit-tablet')).toBe('Tablet');

    expect(resolveBrowserFamily('nation-chromium-mobile')).toBe('Chromium');
    expect(resolveProfile('nation-chromium-mobile')).toBe('Mobile');

    expect(
      resolveBrowserFamily('nation-webkit-mobile', 'webkit', 'WebKit')
    ).toBe('WebKit');
    expect(resolveProfile('nation-webkit-mobile', 'Mobile')).toBe('Mobile');
  });

  test('does not treat tablet as a browser family', () => {
    expect(resolveBrowserFamily('nation-webkit-tablet', 'webkit')).toBe(
      'WebKit'
    );
    expect(resolveBrowserFamily('nation-chromium-tablet', 'chromium')).toBe(
      'Chromium'
    );
    expect(resolveProfile('nation-firefox-tablet')).toBe('Tablet');
  });
});
