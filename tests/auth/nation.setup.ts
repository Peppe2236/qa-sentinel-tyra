import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import { readOptionalCredentials } from '../helpers/env';
import { NATION_AUTH_STATE } from '../helpers/auth-state';
import { completeConfiguredLogin } from '../helpers/complete-login';

setup.setTimeout(120_000);

setup('prepare Nation storageState', async ({ browser, page }) => {
  const { verifyStoredSession, saveVerifiedSession } =
    await import('../../scripts/lib/auth-session.mjs');
  const targetUrl = 'https://nation.dev/home';
  if (fs.existsSync(NATION_AUTH_STATE)) {
    const existing = await verifyStoredSession(browser, NATION_AUTH_STATE, targetUrl);
    if (existing.verified) return;
    console.warn('[Auth] Nation: stored session is not verified.');
  }

  const credentials = readOptionalCredentials('nation');
  if (!credentials) {
    throw new Error('Nation authentication BLOCKED: no valid session or configured credentials. Run npm run auth:nation:refresh:manual, then qa:preflight.');
  }

  await page.goto('https://nation.dev/signin', { waitUntil: 'domcontentloaded' });
  await completeConfiguredLogin(page, credentials, 'Nation');
  // Export only after the login context has opened the protected route.
  const { verifyProtectedPage } = await import('../../scripts/lib/auth-session.mjs');
  const login = await verifyProtectedPage(page, targetUrl);
  if (!login.verified) throw new Error('Nation authentication BLOCKED: ' + login.error);
  const candidate = await page.context().storageState({ indexedDB: true });
  await saveVerifiedSession(browser, candidate, targetUrl, NATION_AUTH_STATE);
});
