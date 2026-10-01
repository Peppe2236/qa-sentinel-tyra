import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import { readOptionalCredentials } from '../helpers/env';
import { AI_SKILLS_AUTH_STATE } from '../helpers/auth-state';
import { completeConfiguredLogin } from '../helpers/complete-login';

setup.setTimeout(120_000);

setup('prepare AI Skills storageState', async ({ browser, page }) => {
  const { verifyStoredSession, saveVerifiedSession } =
    await import('../../scripts/lib/auth-session.mjs');
  const targetUrl = 'https://aiskills.nation.dev/my-pathway';
  if (fs.existsSync(AI_SKILLS_AUTH_STATE)) {
    const existing = await verifyStoredSession(browser, AI_SKILLS_AUTH_STATE, targetUrl);
    if (existing.verified) return;
    console.warn('[Auth] AI Skills: stored session is not verified.');
  }

  const credentials = readOptionalCredentials('ai-skills');
  if (!credentials) {
    throw new Error('AI Skills authentication BLOCKED: no valid session or configured credentials. Run npm run auth:skills:refresh:manual, then qa:preflight.');
  }

  await page.goto('https://aiskills.nation.dev/signin', { waitUntil: 'domcontentloaded' });
  await completeConfiguredLogin(page, credentials, 'AI Skills');
  // Export only after the login context has opened the protected route.
  const { verifyProtectedPage } = await import('../../scripts/lib/auth-session.mjs');
  const login = await verifyProtectedPage(page, targetUrl);
  if (!login.verified) throw new Error('AI Skills authentication BLOCKED: ' + login.error);
  const candidate = await page.context().storageState({ indexedDB: true });
  await saveVerifiedSession(browser, candidate, targetUrl, AI_SKILLS_AUTH_STATE);
});
