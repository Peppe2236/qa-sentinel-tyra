import { test as setup, expect } from '@playwright/test';

import { readOptionalCredentials } from '../helpers/env';
import {
  NATION_AUTH_STATE,
  writeEmptyAuthState,
} from '../helpers/auth-state';
import { NationAuthPage } from '../pages/nation-auth.page';

setup('prepare Nation storageState', async ({ page }) => {
  const credentials = readOptionalCredentials('nation');

  if (!credentials) {
    writeEmptyAuthState(NATION_AUTH_STATE);
    return;
  }

  const auth = new NationAuthPage(page);

  await auth.goto('/signin');
  await auth.emailField().fill(credentials.email);
  await auth.passwordField().fill(credentials.password);
  await auth.signInSubmit().click();
  await expect(page).not.toHaveURL(/\/signin\/?$/i, { timeout: 15_000 });
  await page.context().storageState({ path: NATION_AUTH_STATE });
});
