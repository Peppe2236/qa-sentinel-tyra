import { expect, test } from '@playwright/test';

import {
  httpsLinkFinding,
  mixedContentFinding,
} from '../../reporters/utils/transport-security';
import { qualityMeta } from '../helpers/quality';
import { observeTransportSecurity } from '../helpers/observe-transport';
import { NATION_HOME_URL } from '../pages/nation-home.page';
import { NATION_ORIGIN } from '../pages/nation-auth.page';

test.describe('Nation public transport security', () => {
  test(
    'homepage has no mixed-content http: subresources',
    qualityMeta({
      requirement: 'REQ-NATION-SEC-001',
      criteria: 'AC-NATION-SEC-001-MIXED',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-SECURITY',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
      severity: 'medium',
    }),
    async ({ page }) => {
      const observed = await observeTransportSecurity(page, NATION_HOME_URL);
      const finding = mixedContentFinding('homepage', observed.requestUrls);

      expect(page.url()).toMatch(/^https:/);
      expect(finding.passed, finding.message).toBe(true);
    }
  );

  test(
    'homepage links are https or relative, not http:',
    qualityMeta({
      requirement: 'REQ-NATION-SEC-001',
      criteria: 'AC-NATION-SEC-001-LINKS',
      flow: 'FLOW-NATION-PUBLIC-HOME',
      scenario: 'SCN-NATION-HOME-SECURITY',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
      severity: 'medium',
    }),
    async ({ page }) => {
      const observed = await observeTransportSecurity(page, NATION_HOME_URL);
      const finding = httpsLinkFinding('homepage', observed.hrefs);

      expect(finding.passed, finding.message).toBe(true);
    }
  );

  test(
    'sign-in has no mixed-content http: subresources',
    qualityMeta({
      requirement: 'REQ-NATION-SEC-001',
      criteria: 'AC-NATION-SEC-001-MIXED',
      flow: 'FLOW-NATION-SIGNIN',
      scenario: 'SCN-NATION-SIGNIN-SECURITY',
      category: 'security',
      dimensions: 'security-performance',
      securityCheck: 'transport',
      severity: 'medium',
    }),
    async ({ page }) => {
      const observed = await observeTransportSecurity(
        page,
        `${NATION_ORIGIN}/signin`
      );
      const finding = mixedContentFinding('sign-in', observed.requestUrls);

      expect(page.url()).toMatch(/^https:/);
      expect(finding.passed, finding.message).toBe(true);
    }
  );
});
