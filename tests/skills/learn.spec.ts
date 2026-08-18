import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';

const LEARN_ROUTES = [
  {
    path: '/assessment' as const,
    criterion: 'AC-SKILLS-LEARN-001-ASSESSMENT',
    scenario: 'SCN-SKILLS-ASSESSMENT',
    prompt: /assess|start|task|question|prompt/i,
  },
  {
    path: '/path' as const,
    criterion: 'AC-SKILLS-LEARN-001-PATH',
    scenario: 'SCN-SKILLS-PATH',
    prompt: /path|learn|module|skill|track/i,
  },
  {
    path: '/practice' as const,
    criterion: 'AC-SKILLS-LEARN-001-PRACTICE',
    scenario: 'SCN-SKILLS-PRACTICE',
    prompt: /practice|task|exercise|prompt|try/i,
  },
];

test.describe('AI Skills learning pages', () => {
  for (const route of LEARN_ROUTES) {
    test(
      `${route.path} loads with usable public content`,
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

        await catalog.gotoPath(route.path);
        await expect(page).toHaveURL(new RegExp(`${route.path}(/|$)`, 'i'));

        const text = (await catalog.body().innerText()).trim();

        expect(
          text.length,
          `${route.path} contains too little visible content`
        ).toBeGreaterThan(20);

        const interactive = page.getByRole('button').or(
          page.getByRole('heading')
        );
        const matchingPrompt = page.getByText(route.prompt).first();

        expect(
          (await interactive.count()) + (await matchingPrompt.count()),
          `${route.path} has no heading, button or learning prompt`
        ).toBeGreaterThan(0);
      }
    );
  }
});
