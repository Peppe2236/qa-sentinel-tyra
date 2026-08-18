import { expect, test } from '@playwright/test';

import {
  findingFor,
  headerFindings,
} from '../../reporters/utils/http-security';
import { qualityMeta } from '../helpers/quality';
import { observeDocumentSecurity } from '../helpers/observe-http-security';
import { NATION_HOME_URL } from '../pages/nation-home.page';
import { NATION_ORIGIN } from '../pages/nation-auth.page';

const PAGES = [
  {
    name: 'homepage',
    url: NATION_HOME_URL,
    requirement: 'REQ-NATION-SEC-001',
    flow: 'FLOW-NATION-PUBLIC-HOME',
    scenario: 'SCN-NATION-HOME-SECURITY',
    cspCriterion: 'AC-NATION-SEC-001-CSP',
    headerCriterion: 'AC-NATION-SEC-001-HEADERS',
    cookieCriterion: 'AC-NATION-SEC-001-COOKIES',
  },
  {
    name: 'sign-in',
    url: `${NATION_ORIGIN}/signin`,
    requirement: 'REQ-NATION-SEC-001',
    flow: 'FLOW-NATION-SIGNIN',
    scenario: 'SCN-NATION-SIGNIN-SECURITY',
    cspCriterion: 'AC-NATION-SEC-001-CSP',
    headerCriterion: 'AC-NATION-SEC-001-HEADERS',
    cookieCriterion: 'AC-NATION-SEC-001-COOKIES',
  },
] as const;

test.describe('Nation public security headers', () => {
  for (const target of PAGES) {
    test.describe(target.name, () => {
      test(
        `${target.name} document includes Content-Security-Policy`,
        qualityMeta({
          requirement: target.requirement,
          criteria: target.cspCriterion,
          flow: target.flow,
          scenario: target.scenario,
          category: 'security',
          dimensions: 'security-performance',
          securityCheck: 'content-security-policy',
          severity: 'medium',
        }),
        async ({ page }) => {
          const observed = await observeDocumentSecurity(page, target.url);
          const finding = findingFor(
            headerFindings(target.name, observed.headers, observed.setCookies),
            'csp'
          );

          expect(finding.passed, finding.message).toBe(true);
        }
      );

      test(
        `${target.name} document includes Strict-Transport-Security`,
        qualityMeta({
          requirement: target.requirement,
          criteria: target.headerCriterion,
          flow: target.flow,
          scenario: target.scenario,
          category: 'security',
          dimensions: 'security-performance',
          securityCheck: 'security-headers',
          severity: 'medium',
        }),
        async ({ page }) => {
          const observed = await observeDocumentSecurity(page, target.url);
          const finding = findingFor(
            headerFindings(target.name, observed.headers, observed.setCookies),
            'hsts'
          );

          expect(finding.passed, finding.message).toBe(true);
        }
      );

      test(
        `${target.name} document includes X-Content-Type-Options nosniff`,
        qualityMeta({
          requirement: target.requirement,
          criteria: target.headerCriterion,
          flow: target.flow,
          scenario: target.scenario,
          category: 'security',
          dimensions: 'security-performance',
          securityCheck: 'security-headers',
          severity: 'medium',
        }),
        async ({ page }) => {
          const observed = await observeDocumentSecurity(page, target.url);
          const finding = findingFor(
            headerFindings(target.name, observed.headers, observed.setCookies),
            'x-content-type-options'
          );

          expect(finding.passed, finding.message).toBe(true);
        }
      );

      test(
        `${target.name} document has X-Frame-Options or CSP frame-ancestors`,
        qualityMeta({
          requirement: target.requirement,
          criteria: target.headerCriterion,
          flow: target.flow,
          scenario: target.scenario,
          category: 'security',
          dimensions: 'security-performance',
          securityCheck: 'security-headers',
          severity: 'medium',
        }),
        async ({ page }) => {
          const observed = await observeDocumentSecurity(page, target.url);
          const finding = findingFor(
            headerFindings(target.name, observed.headers, observed.setCookies),
            'clickjacking'
          );

          expect(finding.passed, finding.message).toBe(true);
        }
      );

      test(
        `${target.name} Set-Cookie flags are Secure, HttpOnly and SameSite when cookies are observed`,
        qualityMeta({
          requirement: target.requirement,
          criteria: target.cookieCriterion,
          flow: target.flow,
          scenario: target.scenario,
          category: 'security',
          dimensions: 'security-performance',
          securityCheck: 'session-cookies',
          severity: 'medium',
        }),
        async ({ page }) => {
          const observed = await observeDocumentSecurity(page, target.url);
          const finding = findingFor(
            headerFindings(target.name, observed.headers, observed.setCookies),
            'cookies'
          );

          if (observed.setCookies.length === 0) {
            test.info().annotations.push({
              type: 'security-observation',
              description: 'not-observed',
            });
          }

          expect(finding.passed, finding.message).toBe(true);
        }
      );
    });
  }
});
