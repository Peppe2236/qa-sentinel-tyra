import { test, expect, chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyStoredSession, saveVerifiedSession } from '../../scripts/lib/auth-session.mjs';
let server, browser, origin;
const options = { settleMs: 350, timeout: 5000 };

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Content-Type', 'text/html');
    if (route === '/protected' && !req.headers.cookie?.includes('session=valid')) {
      res.writeHead(302, { Location: '/signin?callbackUrl=%2Fprotected' });
      return res.end();
    }
    if (route === '/server-error') res.statusCode = 500;
    res.end(route === '/signin' || route === '/login-form' ? '<input type="password">'
      : route === '/delayed' ? '<script>setTimeout(()=>location.href="/signin",100)</script>'
      : route === '/local-storage' ? '<script>if(localStorage.getItem("session")!=="valid") setTimeout(()=>location.href="/signin",100)</script><p>Member</p>'
      : '<p>Member</p>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.QA_AUTH_TEST_CHROMIUM_PATH ? {
      executablePath: process.env.QA_AUTH_TEST_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    } : {}),
  });
});
test.afterAll(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
function cookie(value) {
  return { cookies: [{ name: 'session', value, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] };
}

test('expired cookie redirects to signin and is not verified', async () => {
  const result = await verifyStoredSession(browser, cookie('expired'), origin + '/protected', options);
  expect(result.verified).toBe(false);
  expect(result.finalUrl).toContain('/signin?callbackUrl=');
});

test('valid cookie is reused in an isolated context', async () => {
  const result = await verifyStoredSession(browser, cookie('valid'), origin + '/protected', options);
  expect(result.verified).toBe(true);
  expect(result.statusCode).toBe(200);
});

test('delayed client redirect is rejected', async () => {
  expect((await verifyStoredSession(browser, cookie('valid'), origin + '/delayed', options)).verified).toBe(false);
});

test('localStorage token is carried into the fresh verification context', async () => {
  const state = { cookies: [], origins: [{ origin, localStorage: [{ name: 'session', value: 'valid' }] }] };
  expect((await verifyStoredSession(browser, state, origin + '/local-storage', options)).verified).toBe(true);
  expect((await verifyStoredSession(browser, { cookies: [], origins: [] }, origin + '/local-storage', options)).verified).toBe(false);
});

test('HTTP error and login body do not masquerade as protected-page success', async () => {
  for (const route of ['/server-error', '/login-form']) {
    expect((await verifyStoredSession(browser, cookie('valid'), origin + route, options)).verified).toBe(false);
  }
});

test('candidate promotion preserves previous state on failure and replaces it after verification', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tyra-auth-integration-'));
  try {
    const file = path.join(dir, 'auth.json');
    fs.writeFileSync(file, JSON.stringify(cookie('previous')));
    await expect(saveVerifiedSession(browser, cookie('expired'), origin + '/protected', file, options)).rejects.toThrow();
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(cookie('previous'));
    await saveVerifiedSession(browser, cookie('valid'), origin + '/protected', file, options);
    expect((await verifyStoredSession(browser, file, origin + '/protected', options)).verified).toBe(true);
    expect(fs.readdirSync(dir)).toEqual(['auth.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
