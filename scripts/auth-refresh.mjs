import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { verifyStoredSession, saveVerifiedSession } from './lib/auth-session.mjs';

const root = process.cwd();
const siteId = process.argv[2];
const configs = {
  nation: {
    label: 'Nation', targetUrl: 'https://nation.dev/jobs',
    authFile: 'playwright/.auth/nation.json',
    profileName: 'qa-sentinel-nation-auth', port: 9223,
    scanScript: 'scan:nation:auth',
    coverageFile: 'dashboard/data/discovery-coverage-nation.json',
  },
  'ai-skills': {
    label: 'AI Skills', targetUrl: 'https://aiskills.nation.dev/my-pathway',
    authFile: 'playwright/.auth/ai-skills.json',
    profileName: 'qa-sentinel-ai-skills-auth', port: 9222,
    scanScript: 'scan:skills:auth',
    coverageFile: 'dashboard/data/discovery-coverage-ai-skills.json',
  },
};
configs['nation-dev'] = {
  label: 'Nation Dev', targetUrl: 'https://dev.nation.dev/profile',
  authFile: 'playwright/.auth/nation-dev.json',
  profileName: 'qa-sentinel-nation-dev-auth', port: 9224,
  scanScript: 'scan:nation-dev:auth',
  coverageFile: 'dashboard/data/discovery-coverage-nation-dev.json',
};
const config = configs[siteId];
if (!config) {
  console.error('Usage: node scripts/auth-refresh.mjs <nation|ai-skills|nation-dev>');
  process.exit(2);
}
const statusFile = path.resolve(root, 'dashboard/data', `auth-manager-${siteId}.json`);
const authFile = path.resolve(root, config.authFile);
const candidateFile = `${authFile}.capture-${randomUUID()}.json`;
function writeStatus(state, message, extra = {}) {
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  fs.writeFileSync(statusFile, JSON.stringify({
    schemaVersion: 1, siteId, siteLabel: config.label, state, message,
    updatedAt: new Date().toISOString(), ...extra,
  }, null, 2) + '\n');
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root, stdio: 'inherit', env: process.env, ...options,
  });
  if (result.error) throw new Error(`${path.basename(command)} could not start or timed out (${result.error.code ?? 'unknown'}).`);
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed with exit code ${result.status ?? 'unknown'}. See the diagnostic above.`);
}
function windowsPath(file) {
  if (process.platform === 'win32') return file;
  const result = spawnSync('wslpath', ['-w', file], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) {
    throw new Error('Manual Chrome capture requires Windows or WSL with Windows interop enabled.');
  }
  return result.stdout.trim();
}
async function checkSession(storageState) {
  const browser = await chromium.launch({ headless: true });
  try { return await verifyStoredSession(browser, storageState, config.targetUrl); }
  finally { await browser.close(); }
}
async function main() {
  console.log(`\nQA SENTINEL TYRA — ${config.label} AUTH`);
  writeStatus('checking', 'Verifying saved session on the protected route.');
  const existing = fs.existsSync(authFile) ? await checkSession(authFile) : { verified: false };
  if (!existing.verified) {
    writeStatus('waiting-login', 'Opening dedicated Chrome. Sign in normally; capture is limited to 10 minutes.');
    console.log('Saved session is not verified. Opening dedicated QA Chrome...');
    const psScript = windowsPath(path.resolve(root, 'scripts/auth-capture-windows.ps1'));
    const windowsOutput = windowsPath(candidateFile);
    run('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript,
      '-SiteLabel', config.label, '-TargetUrl', config.targetUrl,
      '-OutputPath', windowsOutput, '-Port', String(config.port),
      '-ProfileName', config.profileName, '-TimeoutSeconds', '600',
    ], { timeout: 660000 });
    writeStatus('verifying', 'Candidate captured. Verifying reuse in a fresh context.');
    const browser = await chromium.launch({ headless: true });
    try {
      let candidate;
      try { candidate = JSON.parse(fs.readFileSync(candidateFile, 'utf8')); }
      catch { throw new Error('Captured storage state could not be parsed. Previous session was retained.'); }
      await saveVerifiedSession(browser, candidate, config.targetUrl, authFile);
    } finally { await browser.close(); }
  }
  writeStatus('verifying', 'Session verified. Updating authenticated discovery.');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npmOptions = { shell: process.platform === 'win32' };
  run(npm, ['run', config.scanScript], npmOptions);
  run(npm, ['run', 'scan:coverage'], npmOptions);
  const coveragePath = path.resolve(root, config.coverageFile);
  if (!fs.existsSync(coveragePath)) throw new Error('Authenticated discovery did not produce coverage.');
  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  if (coverage.authenticatedVerified !== true) {
    throw new Error(`${config.label} protected route verification passed, but authenticated discovery was not verified.`);
  }
  writeStatus('complete', 'Authenticated session and discovery verified.', {
    authenticatedVerified: true, coverageGeneratedAt: coverage.generatedAt ?? null,
  });
  console.log(`${config.label}: AUTHENTICATED VERIFIED`);
}
try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Authentication refresh failed.';
  writeStatus('error', message, { authenticatedVerified: false });
  console.error('\nAUTH REFRESH BLOCKED\n' + message);
  process.exitCode = 1;
} finally {
  fs.rmSync(candidateFile, { force: true });
}
