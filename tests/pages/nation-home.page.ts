import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

export const NATION_HOME_URL = 'https://nation.dev/';

export class NationHomePage {
  constructor(private readonly page: Page) {}

  async goto(
    waitUntil: 'domcontentloaded' | 'networkidle' = 'domcontentloaded'
  ): Promise<Response | null> {
    return this.page.goto(NATION_HOME_URL, { waitUntil });
  }

  async expectLoaded(): Promise<Response> {
    const response = await this.goto();

    expect(
      response,
      'The homepage returned no response'
    ).not.toBeNull();

    expect(
      response?.status(),
      `Homepage returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    await expect(this.body()).toBeVisible();

    return response as Response;
  }

  body(): Locator {
    return this.page.locator('body');
  }

  heading(): Locator {
    return this.page.getByRole('heading', {
      name: /tech community.*skills-first platform/i,
    });
  }

  talentLink(): Locator {
    return this.page.getByRole('link', { name: /join as a talent/i }).first();
  }

  organizationLink(): Locator {
    return this.page
      .getByRole('link', { name: /join as an organization/i })
      .first();
  }

  themeToggle(): Locator {
    return this.page.getByRole('button', { name: 'Toggle theme', exact: true });
  }

  sidebarTrigger(): Locator {
    return this.page.locator('[data-sidebar="trigger"]').first();
  }

  privacyLink(): Locator {
    return this.page.getByRole('link', { name: /privacy policy/i }).first();
  }

  termsLink(): Locator {
    return this.page.getByRole('link', { name: /terms of use/i }).first();
  }

  visibleLinks(): Locator {
    return this.page.locator('a:visible');
  }
}
