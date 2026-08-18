import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import { NATION_ORIGIN } from '../pages/nation-auth.page';

const GATED_ROUTES = [
  {
    path: '/home',
    criterion: 'AC-NATION-GATED-001-HOME',
  },
  {
    path: '/jobs',
    criterion: 'AC-NATION-GATED-001-JOBS',
  },
  {
    path: '/profile',
    criterion: 'AC-NATION-GATED-001-PROFILE',
  },
  {
    path: '/benchmarks',
    criterion: 'AC-NATION-GATED-001-BENCHMARKS',
  },
] as const;

test.describe('Nation.dev anonymous gated routes', () => {
  for (const route of GATED_ROUTES) {
    test(
      `anonymous ${route.path} redirects to sign-in`,
      qualityMeta({
        requirement: 'REQ-NATION-GATED-001',
        criteria: route.criterion,
        flow: 'FLOW-NATION-ANONYMOUS-GATED',
        scenario: 'SCN-NATION-GATED-REDIRECT',
        category: 'authentication',
        dimensions: [
          'requirements-functionality',
          'critical-flows',
          'security-performance',
        ],
        securityCheck: 'authentication',
      }),
      async ({ page }) => {
        const response = await page.goto(`${NATION_ORIGIN}${route.path}`, {
          waitUntil: 'domcontentloaded',
        });

        expect(
          response,
          `${route.path} returned no main response`
        ).not.toBeNull();
        expect(
          response?.status(),
          `${route.path} returned HTTP ${response?.status()}`
        ).toBeLessThan(400);

        await expect(page).toHaveURL(/\/signin/i);
        await expect(page.locator('body')).toBeVisible();
      }
    );
  }
});
