import { expect, test } from '@playwright/test';

import { qualityMeta } from '../helpers/quality';
import {
  annotateUxObservation,
  installLayoutShiftObserver,
  observeUxChrome,
  readLayoutShift,
} from '../helpers/observe-ux';
import { NationAuthPage } from '../pages/nation-auth.page';
import { NationHomePage } from '../pages/nation-home.page';

test.describe('Nation UX/UI intelligence signals', () => {
  test(
    'homepage navigation chrome is visible',
    qualityMeta({
      requirement: 'REQ-NATION-UX-001',
      criteria: 'AC-NATION-UX-001-NAV',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-UX',
      category: 'navigation',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const home = new NationHomePage(page);

      await home.goto();

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'navigation',
        page: 'homepage',
        ...chrome,
      });

      annotateUxObservation(testInfo, {
        area: 'usability',
        page: 'homepage',
        ...chrome,
      });

      annotateUxObservation(testInfo, {
        area: 'content-clarity',
        page: 'homepage',
        ...chrome,
      });

      const title =
        (await page.title()).trim();

      const bodyText =
        (await home.body().innerText())
          .trim();

      expect(
        title,
        'Homepage document title is empty'
      ).not.toBe('');

      expect(
        chrome.headingCount,
        'Homepage has no visible heading'
      ).toBeGreaterThan(0);

      expect(
        bodyText.length,
        'Homepage contains too little visible content'
      ).toBeGreaterThan(20);

      expect(
        chrome.navLandmark || chrome.visibleLinkCount > 0,
        `Homepage has no visible navigation landmark or links (links=${chrome.visibleLinkCount})`
      ).toBe(true);

      await expect(home.visibleLinks().first()).toBeVisible();
    }
  );

  test(
    'sign-in form controls are present',
    qualityMeta({
      requirement: 'REQ-NATION-UX-001',
      criteria: 'AC-NATION-UX-001-FORMS',
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-UX',
      category: 'authentication',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const auth = new NationAuthPage(page);

      await auth.goto('/signin');

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'forms-validation',
        page: 'sign-in',
        ...chrome,
      });

      const email =
        auth.emailField();

      const password =
        auth.passwordField();

      await expect(email).toBeVisible();
      await expect(password).toBeVisible();
      await expect(auth.signInSubmit()).toBeVisible();

      await expect(email)
        .toHaveAttribute('type', /email/i);

      await email.fill('not-an-email');

      expect(
        await email.evaluate(
          element =>
            (element as HTMLInputElement)
              .checkValidity()
        ),
        'Email field accepted an invalid email address'
      ).toBe(false);

      await email.fill(
        'qa-ux-verification@example.com'
      );

      await password.fill(
        'SafeUxVerification123!'
      );

      await expect(email).toHaveValue(
        'qa-ux-verification@example.com'
      );

      await expect(password).toHaveValue(
        'SafeUxVerification123!'
      );

      await email.focus();

      expect(
        await email.evaluate(
          element =>
            document.activeElement ===
            element
        ),
        'Email field could not receive keyboard focus'
      ).toBe(true);

      annotateUxObservation(testInfo, {
        area: 'interaction',
        page: 'sign-in',
        ...chrome,
      });

      expect(
        chrome.formControlCount,
        'Sign-in page has no visible form controls'
      ).toBeGreaterThan(0);
    }
  );

  test(
    'homepage remains usable with prefers-reduced-motion',
    qualityMeta({
      requirement: 'REQ-NATION-UX-001',
      criteria: 'AC-NATION-UX-001-MOTION',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-UX',
      category: 'accessibility',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const home = new NationHomePage(page);

      await home.goto();

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'accessibility',
        page: 'homepage',
        reducedMotion: 'reduce',
        ...chrome,
      });

      await expect(home.body()).toBeVisible();
      expect(
        chrome.headingCount + chrome.visibleLinkCount,
        'Reduced-motion homepage has no visible heading or links'
      ).toBeGreaterThan(0);
    }
  );

  test(
    'homepage layout-shift is observed without treating absence as poor',
    qualityMeta({
      requirement: 'REQ-NATION-UX-001',
      criteria: 'AC-NATION-UX-001-SHIFT',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-UX',
      category: 'visual',
      dimensions: 'ux-ui',
      severity: 'low',
    }),
    async ({ page }, testInfo) => {
      await installLayoutShiftObserver(page);

      const home = new NationHomePage(page);

      await home.goto();
      await page.waitForTimeout(500);

      const shift = await readLayoutShift(page);

      annotateUxObservation(testInfo, {
        area: 'visual-stability',
        page: 'homepage',
        cls: shift.cls,
        layoutShiftSource: shift.source,
        sampleCount: shift.sampleCount,
      });

      if (shift.source === 'not-observed') {
        testInfo.annotations.push({
          type: 'ux-observation',
          description: 'layout-shift-not-observed',
        });
      } else {
        expect(
          typeof shift.cls === 'number'
            ? shift.cls
            : Number.POSITIVE_INFINITY,
          'Cumulative Layout Shift exceeded 0.25'
        ).toBeLessThanOrEqual(0.25);
      }

      await expect(home.body()).toBeVisible();
    }
  );

  test(
    'homepage chrome stays usable at the current matrix viewport',
    qualityMeta({
      requirement: 'REQ-NATION-UX-001',
      criteria: 'AC-NATION-UX-001-VIEWPORT',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-UX',
      category: 'responsive',
      dimensions: 'ux-ui',
      severity: 'medium',
    }),
    async ({ page }, testInfo) => {
      const home = new NationHomePage(page);

      await home.goto();

      const chrome = await observeUxChrome(page);
      annotateUxObservation(testInfo, {
        area: 'responsive-usability',
        page: 'homepage',
        ...chrome,
      });

      await expect(home.body()).toBeVisible();

      const dimensions =
        await page.evaluate(() => ({
          clientWidth:
            document.documentElement
              .clientWidth,
          scrollWidth:
            document.documentElement
              .scrollWidth,
        }));

      expect(
        dimensions.scrollWidth,
        `Horizontal overflow at ${chrome.viewportWidth}x${chrome.viewportHeight}`
      ).toBeLessThanOrEqual(
        dimensions.clientWidth + 2
      );

      expect(
        chrome.navLandmark || chrome.visibleLinkCount > 0,
        `Viewport ${chrome.viewportWidth}x${chrome.viewportHeight} has no visible navigation chrome`
      ).toBe(true);
    }
  );
});
