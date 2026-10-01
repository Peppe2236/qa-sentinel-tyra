import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { matchesProtectedUrl, verifyProtectedPage, verifyStoredSession, saveVerifiedSession, hasUsableSessionCookie } from '../../scripts/lib/auth-session.mjs';

function fakeBrowser({ finalUrl = 'https://aiskills.nation.dev/my-pathway', status = 200, loginForm = 0, failLoad = false } = {}) {
  let closed = false;
  const page = {
    on() {}, off() {},
    async goto() { return { status: () => status }; },
    async waitForTimeout() {}, url: () => finalUrl,
    locator: () => ({ count: async () => loginForm }),
  };
  return {
    page, get closed() { return closed; },
    async newContext() {
      if (failLoad) throw new Error('Invalid state with secret-cookie-value');
      return { newPage: async () => page, close: async () => { closed = true; } };
    },
  };
}
const target = 'https://aiskills.nation.dev/my-pathway';
const validState = { cookies: [{ name: '__Secure-authjs.session-token', value: 'fixture',
  domain: 'aiskills.nation.dev', path: '/', secure: true, expires: -1 }], origins: [] };

test('cookies in a file do not verify a session redirected to signin with callback query', async () => {
  const browser = fakeBrowser({ finalUrl: 'https://aiskills.nation.dev/signin?callbackUrl=%2Fmy-pathway' });
  const result = await verifyStoredSession(browser, validState, target);
  expect(result.verified).toBe(false);
  expect(result.error).toContain('redirected');
  expect(browser.closed).toBe(true);
});

test('same protected URL with HTTP 500 is not authentication evidence', async () => {
  const result = await verifyProtectedPage(fakeBrowser({ status: 500 }).page, target);
  expect(result.verified).toBe(false);
  expect(result.error).toContain('HTTP 500');
});

test('login form at protected URL is rejected', async () => {
  expect((await verifyStoredSession(fakeBrowser({ loginForm: 1 }), validState, target)).verified).toBe(false);
});

test('a fresh-context protected route accepts valid reusable state', async () => {
  const browser = fakeBrowser();
  expect((await verifyStoredSession(browser, validState, target)).verified).toBe(true);
  expect(browser.closed).toBe(true);
});

test('state parsing errors do not leak cookie values', async () => {
  const result = await verifyStoredSession(fakeBrowser({ failLoad: true }), 'bad.json', target);
  expect(result.verified).toBe(false);
  expect(result.error).not.toContain('secret-cookie-value');
});

test('failed candidate keeps the saved session intact and creates no temporary file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tyra-auth-test-'));
  try {
    const authFile = path.join(dir, 'auth.json');
    fs.writeFileSync(authFile, 'original-state');
    await expect(saveVerifiedSession(fakeBrowser({ status: 401 }), validState, target, authFile)).rejects.toThrow('HTTP 401');
    expect(fs.readFileSync(authFile, 'utf8')).toBe('original-state');
    expect(fs.readdirSync(dir)).toEqual(['auth.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('verified candidate is saved including localStorage and no temporary file remains', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tyra-auth-test-'));
  try {
    const state = { cookies: validState.cookies, origins: [{ origin: 'https://aiskills.nation.dev', localStorage: [{ name: 'token', value: 'candidate' }] }] };
    const authFile = path.join(dir, 'auth.json');
    await saveVerifiedSession(fakeBrowser(), state, target, authFile);
    expect(JSON.parse(fs.readFileSync(authFile, 'utf8'))).toEqual(state);
    expect(fs.readdirSync(dir)).toEqual(['auth.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('protected URL matching rejects another origin or signin and accepts a trailing slash', () => {
  expect(matchesProtectedUrl(target + '/', target)).toBe(true);
  expect(matchesProtectedUrl('http://aiskills.nation.dev/my-pathway', target)).toBe(false);
  expect(matchesProtectedUrl('https://aiskills.nation.dev/signin?callbackUrl=/my-pathway', target)).toBe(false);
});

test('known sites require applicable named session cookies including chunked names', () => {
  const stateWith = cookie => ({ cookies: [{ ...validState.cookies[0], ...cookie }], origins: [] });
  expect(hasUsableSessionCookie(validState, target)).toBe(true);
  expect(hasUsableSessionCookie(stateWith({ name: '__Secure-authjs.session-token.0' }), target)).toBe(true);
  for (const cookie of [{ name: 'analytics' }, { name: 42 }, { value: '' },
    { expires: 1300 }, { domain: 'dev.nation.dev' }, { path: '/signin' }, { secure: false },
    { name: '__Secure-authjs.session-token-fake' }]) {
    expect(hasUsableSessionCookie(stateWith(cookie), target, 1000)).toBe(false);
  }
  expect(hasUsableSessionCookie(stateWith({ expires: 1301 }), target, 1000)).toBe(true);
  expect(hasUsableSessionCookie(stateWith({ domain: '.nation.dev' }), target)).toBe(true);
  expect(hasUsableSessionCookie(stateWith({ name: '__Secure-nation.session_token', domain: 'nation.dev' }), 'https://nation.dev/home')).toBe(true);
});

test('public-looking HTTP 200 cannot promote a known-site state without its auth cookie', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tyra-cookie-policy-'));
  try {
    const file = path.join(dir, 'auth.json');
    fs.writeFileSync(file, 'previous');
    const browser = fakeBrowser();
    await expect(saveVerifiedSession(browser, { cookies: [], origins: [] }, target, file)).rejects.toThrow('Required session cookie');
    expect(browser.closed).toBe(false); // Rejected before creating a browser context.
    expect(fs.readFileSync(file, 'utf8')).toBe('previous');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Nation Dev uses live protected navigation without inventing a cookie name', async () => {
  const devTarget = 'https://dev.nation.dev/profile';
  expect((await verifyStoredSession(fakeBrowser({ finalUrl: devTarget }), { cookies: [], origins: [] }, devTarget)).verified).toBe(true);
  expect((await verifyStoredSession(fakeBrowser({ finalUrl: 'https://dev.nation.dev/signin' }), { cookies: [], origins: [] }, devTarget)).verified).toBe(false);
});
