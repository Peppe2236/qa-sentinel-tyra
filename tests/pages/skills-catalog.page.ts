import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

export const SKILLS_ORIGIN = 'https://aiskills.nation.dev';
export const SKILLS_CATALOG_URL = `${SKILLS_ORIGIN}/skills`;

const NAMED_SKILLS = ['gamma', 'claude', 'notebooklm'] as const;

export type NamedSkill = (typeof NAMED_SKILLS)[number];

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

  async gotoPath(pathname: string): Promise<Response | null> {
    const response = await this.page.goto(`${SKILLS_ORIGIN}${pathname}`, {
      waitUntil: 'domcontentloaded',
    });

    expect(
      response,
      `${pathname} returned no main response`
    ).not.toBeNull();

    expect(
      response?.status(),
      `${pathname} returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    await expect(this.body()).toBeVisible();

    return response;
  }

  body(): Locator {
    return this.page.locator('body');
  }

  heading(): Locator {
    return this.page.getByRole('heading').first();
  }

  learningLinks(): Locator {
    return this.page.getByRole('link', {
      name: /assessment|path|practice|skill/i,
    });
  }

  namedSkillLink(skill: NamedSkill): Locator {
    return this.page.getByRole('link', { name: new RegExp(skill, 'i') }).first();
  }

  emailField(): Locator {
    return this.page.getByRole('textbox', { name: /email/i }).first();
  }

  passwordField(): Locator {
    return this.page.locator('input[type="password"]').first();
  }

  signInSubmit(): Locator {
    return this.page
      .getByRole('button', { name: /sign in|log in|continue/i })
      .first();
  }
}

export { NAMED_SKILLS };
