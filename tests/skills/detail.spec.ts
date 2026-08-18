import { test, expect } from '@playwright/test';
import { qualityMeta } from '../helpers/quality';
import {
  NAMED_SKILLS,
  SkillsCatalogPage,
  type NamedSkill,
} from '../pages/skills-catalog.page';

test.describe('AI Skills named skill pages', () => {
  for (const skill of NAMED_SKILLS) {
    test(
      `/skills/${skill} loads with visible content`,
      qualityMeta({
        requirement: 'REQ-SKILLS-DETAIL-001',
        criteria: 'AC-SKILLS-DETAIL-001-HTTP',
        flow: 'FLOW-SKILLS-DETAIL',
        scenario: 'SCN-SKILLS-DETAIL-HTTP',
        category: 'content',
        dimensions: 'requirements-functionality',
      }),
      async ({ page }) => {
        const catalog = new SkillsCatalogPage(page);
        const path = `/skills/${skill as NamedSkill}`;

        await catalog.gotoPath(path);
        await expect(page).toHaveURL(new RegExp(`/skills/${skill}`, 'i'));
        await expect(page).toHaveTitle(/\S+/);

        const text = (await catalog.body().innerText()).trim();

        expect(
          text.length,
          `${path} contains too little visible content`
        ).toBeGreaterThan(20);
      }
    );
  }
});
