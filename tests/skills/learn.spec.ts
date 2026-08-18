import { test, expect } from '@playwright/test';

import { dismissFirstPartyChallenges } from '../helpers/first-party-challenges';
import { qualityMeta } from '../helpers/quality';
import {
  SKILLS_ORIGIN,
  SkillsCatalogPage,
} from '../pages/skills-catalog.page';

const LEARN_ROUTES = [
  {
    path: '/assessment' as const,
    criterion: 'AC-SKILLS-LEARN-001-ASSESSMENT',
    scenario: 'SCN-SKILLS-ASSESSMENT',
    prompt: /assess|start|task|question|prompt|begin/i,
  },
  {
    path: '/path' as const,
    criterion: 'AC-SKILLS-LEARN-001-PATH',
    scenario: 'SCN-SKILLS-PATH',
    prompt: /path|learn|module|skill|track|start/i,
  },
  {
    path: '/practice' as const,
    criterion: 'AC-SKILLS-LEARN-001-PRACTICE',
    scenario: 'SCN-SKILLS-PRACTICE',
    prompt: /practice|task|exercise|prompt|try|start/i,
  },
];

const SERVER_ERROR = /internal server error|\bhttp\s*500\b|typeerror|stack trace/i;

test.describe('AI Skills learning pages', () => {
  for (const route of LEARN_ROUTES) {
    test(
      `${route.path} is public with landmarks or redirects to sign-in`,
      qualityMeta({
        requirement: 'REQ-SKILLS-LEARN-001',
        criteria: route.criterion,
        flow: 'FLOW-SKILLS-LEARN',
        scenario: route.scenario,
        category: 'content',
        dimensions: ['requirements-functionality', 'critical-flows'],
      }),
      async ({ page }) => {
        const catalog = new SkillsCatalogPage(page);
        const response = await page.goto(`${SKILLS_ORIGIN}${route.path}`, {
          waitUntil: 'domcontentloaded',
        });

        expect(
          response,
          `${route.path} returned no main response`
        ).not.toBeNull();

        const status = response?.status() ?? 0;

        expect(
          status,
          `${route.path} returned HTTP ${status}`
        ).toBeLessThan(500);

        await expect(catalog.body()).toBeVisible();
        await dismissFirstPartyChallenges(page);

        const text = (await catalog.body().innerText()).trim();

        expect(
          text,
          `${route.path} rendered server-error copy`
        ).not.toMatch(SERVER_ERROR);

        if (/\/signin/i.test(page.url())) {
          await expect(page).toHaveURL(/\/signin/i);
          await expect(
            page.getByRole('textbox', { name: /email/i }).first()
          ).toBeVisible();
          return;
        }

        expect(
          text.length,
          `${route.path} contains too little visible content`
        ).toBeGreaterThan(20);

        const startCta = page.getByRole('button', {
          name: /start|begin|assess|continue|try/i,
        }).or(
          page.getByRole('link', {
            name: /start|begin|assess|continue|try|path|practice/i,
          })
        );
        const matchingPrompt = page.getByText(route.prompt).first();
        const heading = page.getByRole('heading').first();

        expect(
          (await startCta.count()) +
            (await matchingPrompt.count()) +
            (await heading.count()),
          `${route.path} has no start CTA, heading or learning prompt`
        ).toBeGreaterThan(0);
      }
    );
  }
});
