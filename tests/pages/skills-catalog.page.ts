import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

export const SKILLS_CATALOG_URL = 'https://aiskills.nation.dev/skills';

export class SkillsCatalogPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<Response | null> {
    const response = await this.page.goto(SKILLS_CATALOG_URL, {
      waitUntil: 'domcontentloaded',
    });

    expect(
      response,
      'The main page request returned no response'
    ).not.toBeNull();

    expect(
      response?.status(),
      `The main page returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    await expect(this.body()).toBeVisible();

    return response;
  }

  body(): Locator {
    return this.page.locator('body');
  }
}
