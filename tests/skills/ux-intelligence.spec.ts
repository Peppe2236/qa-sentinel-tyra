import { expect, test } from '@playwright/test';

import { qualityMeta } from '../helpers/quality';
import {
  annotateUxObservation,
  installLayoutShiftObserver,
  observeUxChrome,
  readLayoutShift,
} from '../helpers/observe-ux';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';

test.describe('AI Skills UX/UI intelligence signals', () => {
  test(
    'catalog navigation chrome is visible',
    qualityMeta({
      requirement: 'REQ-SKILLS-UX-001',
      criteria: 'AC-SKILLS-UX-001-NAV',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-UX',
      category: 'navigation',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'navigation',
        page: 'catalog',
        ...chrome,
      });

      expect(
        chrome.navLandmark || chrome.visibleLinkCount > 0,
        `Catalog has no visible navigation landmark or links (links=${chrome.visibleLinkCount})`
      ).toBe(true);
    }
  );

  test(
    'sign-in form controls are present',
    qualityMeta({
      requirement: 'REQ-SKILLS-UX-001',
      criteria: 'AC-SKILLS-UX-001-FORMS',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-UX',
      category: 'authentication',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.gotoPath('/signin');

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'forms-validation',
        page: 'sign-in',
        ...chrome,
      });

      await expect(catalog.emailField()).toBeVisible();
      await expect(catalog.passwordField()).toBeVisible();
      await expect(catalog.signInSubmit()).toBeVisible();
      expect(
        chrome.formControlCount,
        'Sign-in page has no visible form controls'
      ).toBeGreaterThan(0);
    }
  );

  test(
    'catalog remains usable with prefers-reduced-motion',
    qualityMeta({
      requirement: 'REQ-SKILLS-UX-001',
      criteria: 'AC-SKILLS-UX-001-MOTION',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-UX',
      category: 'accessibility',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'accessibility',
        page: 'catalog',
        reducedMotion: 'reduce',
        ...chrome,
      });

      await expect(catalog.body()).toBeVisible();
      expect(
        chrome.headingCount + chrome.visibleLinkCount,
        'Reduced-motion catalog has no visible heading or links'
      ).toBeGreaterThan(0);
    }
  );

  test(
    'catalog layout-shift is observed without treating absence as poor',
    qualityMeta({
      requirement: 'REQ-SKILLS-UX-001',
      criteria: 'AC-SKILLS-UX-001-SHIFT',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-UX',
      category: 'visual',
      dimensions: 'ux-ui',
      severity: 'low',
    }),
    async ({ page }, testInfo) => {
      await installLayoutShiftObserver(page);

      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();
      await page.waitForTimeout(500);

      const shift = await readLayoutShift(page);

      annotateUxObservation(testInfo, {
        area: 'visual-stability',
        page: 'catalog',
        cls: shift.cls,
        layoutShiftSource: shift.source,
        sampleCount: shift.sampleCount,
      });

      if (shift.source === 'not-observed') {
        testInfo.annotations.push({
          type: 'ux-observation',
          description: 'layout-shift-not-observed',
        });
      }

      await expect(catalog.body()).toBeVisible();
    }
  );

  test(
    'catalog chrome stays usable at the current matrix viewport',
    qualityMeta({
      requirement: 'REQ-SKILLS-UX-001',
      criteria: 'AC-SKILLS-UX-001-VIEWPORT',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-UX',
      category: 'responsive',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const catalog = new SkillsCatalogPage(page);

      await catalog.goto();

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'responsive-usability',
        page: 'catalog',
        ...chrome,
      });

      await expect(catalog.body()).toBeVisible();
      expect(
        chrome.navLandmark || chrome.visibleLinkCount > 0,
        `Viewport ${chrome.viewportWidth}x${chrome.viewportHeight} has no visible navigation chrome`
      ).toBe(true);
    }
  );
});
