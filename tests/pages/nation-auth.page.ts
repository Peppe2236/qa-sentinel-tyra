import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

import { dismissFirstPartyChallenges } from '../helpers/first-party-challenges';

export const NATION_ORIGIN = 'https://nation.dev';

export class NationAuthPage {
  constructor(private readonly page: Page) {}

  async goto(
    route: '/signin' | '/signup' | '/forgot-password'
  ): Promise<Response | null> {
    const response = await this.page.goto(`${NATION_ORIGIN}${route}`, {
      waitUntil: 'domcontentloaded',
    });

    expect(
      response,
      `${route} returned no main response`
    ).not.toBeNull();

    expect(
      response?.status(),
      `${route} returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    await expect(this.page.locator('body')).toBeVisible();
    await dismissFirstPartyChallenges(this.page);

    return response;
  }

  /**
   * Live /signin uses a brand heading ("nation.dev") and a Sign in submit
   * control, not an h1 "Sign in". Prefer email/password form locators.
   */
  signInHeading(): Locator {
    return this.page.getByRole('heading', {
      name: /sign in|welcome back|log in/i,
    }).first();
  }

  signInForm(): Locator {
    return this.page
      .locator('form')
      .filter({ has: this.emailField() })
      .first();
  }

  signUpHeading(): Locator {
    return this.page
      .getByRole('heading', {
        name: /sign up|create.*account|join/i,
      })
      .first();
  }

  emailField(): Locator {
    return this.page.getByRole('textbox', { name: /email/i }).first();
  }

  passwordField(): Locator {
    return this.page
      .locator(
        'input[name="Passwd"], input[type="password"]:not([aria-hidden="true"]):not([name="hiddenPassword"]):not([tabindex="-1"])'
      )
      .first();
  }

  signInSubmit(): Locator {
    return this.page
      .getByRole('button', { name: /sign in|log in/i })
      .first();
  }

  signUpSubmit(): Locator {
    return this.page
      .getByRole('button', {
        name: /sign up|create.*account|continue|register/i,
      })
      .first();
  }

  forgotPasswordLink(): Locator {
    return this.page
      .getByRole('link', {
        name: /forgot.*password|reset.*password/i,
      })
      .first();
  }

  passwordResetSubmit(): Locator {
    return this.page
      .getByRole('button', {
        name: /reset|send|continue|submit/i,
      })
      .first();
  }

  visibleInputs(): Locator {
    return this.page.locator('input:visible');
  }

  bodyText(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}
