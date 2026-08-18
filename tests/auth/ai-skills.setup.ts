import { test as setup, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import {
  AI_SKILLS_AUTH_STATE,
  writeEmptyAuthState,
} from '../helpers/auth-state';
import { SkillsCatalogPage } from '../pages/skills-catalog.page';
import { completeConfiguredLogin } from '../helpers/complete-login';

setup.setTimeout(120_000);

setup('prepare AI Skills storageState', async ({ page }) => {
  writeEmptyAuthState(AI_SKILLS_AUTH_STATE);

  const credentials = readOptionalCredentials('ai-skills');

  if (!credentials) {
    return;
  }

  const catalog = new SkillsCatalogPage(page);

  await catalog.gotoPath('/signin');
  await completeConfiguredLogin(page, credentials, 'AI Skills');
  await expect(page).toHaveURL(/aiskills\.nation\.dev/i, { timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 20_000 });
  await page.context().storageState({ path: AI_SKILLS_AUTH_STATE });
});
