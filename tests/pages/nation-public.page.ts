import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

import { NATION_ORIGIN } from './nation-auth.page';
import { dismissFirstPartyChallenges } from '../helpers/first-party-challenges';

export class NationPublicPage {
  constructor(private readonly page: Page) {}

  async goto(pathname: string): Promise<Response | null> {
    const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const response = await this.page.goto(`${NATION_ORIGIN}${path}`, {
      waitUntil: 'domcontentloaded',
    });

    expect(
      response,
      `${path} returned no main response`
    ).not.toBeNull();

    expect(
      response?.status(),
      `${path} returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    await expect(this.body()).toBeVisible();
    await dismissFirstPartyChallenges(this.page);

    return response;
  }

  body(): Locator {
    return this.page.locator('body');
  }

  async visibleText(): Promise<string> {
    return (await this.body().innerText()).trim();
  }
}
