import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function cleanPath(value) {
  return value.replace(/\/+$/, '') || '/';
}

export function matchesProtectedUrl(actualUrl, expectedUrl) {
  try {
    const actual = new URL(actualUrl);
    const expected = new URL(expectedUrl);
    return actual.origin === expected.origin &&
      cleanPath(actual.pathname) === cleanPath(expected.pathname);
  } catch {
    return false;
  }
}

// Keep the site-specific cookie checks from the operator's three-site copy.
// Nation Dev has no established cookie-name policy; its protected route is verified live.
const cookiePolicies = {
  'https://nation.dev': '__Secure-nation.session_token',
  'https://aiskills.nation.dev': '__Secure-authjs.session-token',
};

export function hasUsableSessionCookie(storageState, targetUrl, nowSeconds = Date.now() / 1000) {
  const target = new URL(targetUrl);
  const prefix = cookiePolicies[target.origin];
  if (!prefix) return true;
  return Array.isArray(storageState?.cookies) && storageState.cookies.some(cookie => {
    if (typeof cookie?.name !== 'string' || typeof cookie.value !== 'string' || !cookie.value) return false;
    if (cookie.name !== prefix && !cookie.name.startsWith(prefix + '.')) return false;
    const domain = typeof cookie.domain === 'string' ? cookie.domain.replace(/^\./, '') : '';
    const applicable = domain && (cookie.domain.startsWith('.')
      ? target.hostname === domain || target.hostname.endsWith('.' + domain)
      : target.hostname === domain);
    const cookiePath = typeof cookie.path === 'string' ? cookie.path : '';
    const pathMatches = cookiePath && (target.pathname === cookiePath ||
      (target.pathname.startsWith(cookiePath) && (cookiePath.endsWith('/') || target.pathname[cookiePath.length] === '/')));
    return applicable && pathMatches && cookie.secure === true &&
      typeof cookie.expires === 'number' && (cookie.expires === -1 || cookie.expires > nowSeconds + 300);
  });
}

// Check an actual protected navigation, including client-side redirects.
// Cookie presence and a fleeting visit to the target URL are insufficient.
export async function verifyProtectedPage(page, targetUrl, options = {}) {
  const { timeout = 20000, settleMs = 2000 } = options;
  let statusCode = null;
  const onResponse = response => {
    if (response.request().isNavigationRequest() &&
        response.frame() === page.mainFrame()) statusCode = response.status();
  };
  page.on('response', onResponse);
  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded', timeout,
    });
    if (response) statusCode = response.status();
    await page.waitForTimeout(settleMs);
    const finalUrl = page.url();
    const onProtectedPage = matchesProtectedUrl(finalUrl, targetUrl);
    const loginForm = await page.locator(
      'input[type="password"]:visible, form[action*="signin"]:visible, form[action*="login"]:visible'
    ).count();
    const verified = onProtectedPage && statusCode !== null &&
      statusCode >= 200 && statusCode < 400 && loginForm === 0;
    const reason = verified ? null : !onProtectedPage
      ? 'Protected route redirected; session expired or not accepted.'
      : loginForm > 0 ? 'Protected route shows a login form.'
      : `Protected route returned HTTP ${statusCode ?? 'unknown'}.`;
    return { verified, finalUrl, statusCode, error: reason };
  } catch (error) {
    return {
      verified: false, finalUrl: page.url(), statusCode,
      // Do not include request URLs/headers or storage values in diagnostics.
      error: error?.name === 'TimeoutError'
        ? 'Protected route verification timed out.'
        : 'Protected route verification failed (browser, network or storage state).',
    };
  } finally {
    page.off('response', onResponse);
  }
}

export async function verifyStoredSession(browser, storageState, targetUrl, options = {}) {
  let context;
  try {
    const state = typeof storageState === 'string'
      ? JSON.parse(fs.readFileSync(storageState, 'utf8')) : storageState;
    if (!hasUsableSessionCookie(state, targetUrl)) return {
      verified: false, finalUrl: null, statusCode: null,
      error: 'Required session cookie is missing, expired or not applicable to the protected route.',
    };
    context = await browser.newContext({ storageState: state });
    return await verifyProtectedPage(await context.newPage(), targetUrl, options);
  } catch {
    return {
      verified: false, finalUrl: null, statusCode: null,
      error: 'Storage state could not be loaded into a fresh browser context.',
    };
  } finally {
    await context?.close().catch(() => {});
  }
}

// Keep the previous file until the exported session passes fresh-context reuse.
export async function saveVerifiedSession(browser, storageState, targetUrl, authFile, options = {}) {
  const result = await verifyStoredSession(browser, storageState, targetUrl, options);
  if (!result.verified) throw new Error(result.error || 'Authentication not verified.');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  const candidate = `${authFile}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(candidate, JSON.stringify(storageState, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(candidate, authFile);
  } finally {
    fs.rmSync(candidate, { force: true });
  }
  return result;
}
