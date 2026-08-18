import { test as setup, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import {
  AI_SKILLS_AUTH_STATE,
  writeEmptyAuthState,
} from '../helpers/auth-state';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';
import { handleFirstPartyCaptcha } from '../helpers/first-party-challenges';

setup('prepare AI Skills storageState', async ({ page }) => {
  const credentials = readOptionalCredentials('ai-skills');

  if (!credentials) {
    writeEmptyAuthState(AI_SKILLS_AUTH_STATE);
    return;
  }

  const catalog = new SkillsCatalogPage(page);

  await catalog.gotoPath('/signin');

  const captcha = await handleFirstPartyCaptcha(page);

  if (captcha.blocked) {
    writeEmptyAuthState(AI_SKILLS_AUTH_STATE);
    return;
  }

  await catalog.emailField().fill(credentials.email);
  await catalog.passwordField().fill(credentials.password);
  await catalog.signInSubmit().click();

  const afterSubmit = await handleFirstPartyCaptcha(page);

  if (afterSubmit.blocked) {
    writeEmptyAuthState(AI_SKILLS_AUTH_STATE);
    return;
  }

  await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 15_000 });
  await page.context().storageState({ path: AI_SKILLS_AUTH_STATE });
});
