import { expect, test } from '@playwright/test';

import {
  httpsLinkFinding,
  mixedContentFinding,
} from '../../reporters/utils/transport-security';
import { qualityMeta } from '../helpers/quality';
import { observeTransportSecurity } from '../helpers/observe-transport';
import {
  SKILLS_CATALOG_URL,
  SKILLS_ORIGIN,
} from '../pages/skills-catalog.page';

test.describe('AI Skills public transport security', () => {
  test(
    'catalog has no mixed-content http: subresources',
    qualityMeta({
      requirement: 'REQ-SKILLS-SEC-001',
      criteria: 'AC-SKILLS-SEC-001-MIXED',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-SECURITY',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
      severity: 'medium',
    }),
    async ({ page }) => {
      const observed = await observeTransportSecurity(page, SKILLS_CATALOG_URL);
      const finding = mixedContentFinding('catalog', observed.requestUrls);

      expect(page.url()).toMatch(/^https:/);
      expect(finding.passed, finding.message).toBe(true);
    }
  );

  test(
    'catalog links are https or relative, not http:',
    qualityMeta({
      requirement: 'REQ-SKILLS-SEC-001',
      criteria: 'AC-SKILLS-SEC-001-LINKS',
      flow: 'FLOW-SKILLS-CATALOG',
      scenario: 'SCN-SKILLS-CATALOG-SECURITY',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
      severity: 'medium',
    }),
    async ({ page }) => {
      const observed = await observeTransportSecurity(page, SKILLS_CATALOG_URL);
      const finding = httpsLinkFinding('catalog', observed.hrefs);

      expect(finding.passed, finding.message).toBe(true);
    }
  );

  test(
    'sign-in has no mixed-content http: subresources',
    qualityMeta({
      requirement: 'REQ-SKILLS-SEC-001',
      criteria: 'AC-SKILLS-SEC-001-MIXED',
      flow: 'FLOW-SKILLS-AUTH',
      scenario: 'SCN-SKILLS-AUTH-SECURITY',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
      severity: 'medium',
    }),
    async ({ page }) => {
      const observed = await observeTransportSecurity(
        page,
        `${SKILLS_ORIGIN}/signin`
      );
      const finding = mixedContentFinding('sign-in', observed.requestUrls);

      expect(page.url()).toMatch(/^https:/);
      expect(finding.passed, finding.message).toBe(true);
    }
  );
});
