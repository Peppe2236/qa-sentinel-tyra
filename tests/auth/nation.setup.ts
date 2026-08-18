import { test as setup, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import {
  NATION_AUTH_STATE,
  writeEmptyAuthState,
} from '../helpers/auth-state';
import { NationAuthPage } from '../pages/nation-auth.page';
import { completeConfiguredLogin } from '../helpers/complete-login';

setup.setTimeout(120_000);

setup('prepare Nation storageState', async ({ page }) => {
  writeEmptyAuthState(NATION_AUTH_STATE);

  const credentials = readOptionalCredentials('nation');

  if (!credentials) {
    return;
  }

  const auth = new NationAuthPage(page);

  await auth.goto('/signin');
  await completeConfiguredLogin(page, credentials, 'Nation');
  await expect(page).toHaveURL(/https:\/\/(www\.)?nation\.dev\b/i, {
    timeout: 20_000,
  });
  await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 20_000 });
  await page.context().storageState({ path: NATION_AUTH_STATE });
});
