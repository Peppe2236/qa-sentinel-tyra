const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const process = require('node:process');

const DASHBOARD_URL = 'http://127.0.0.1:4173/';
const REPORT_URL = 'http://127.0.0.1:9323/';
const CHECK_ONLY = process.argv.includes('--check');
const SKIP_TESTS = process.argv.includes('--no-test');
const AUTO_CLOSE = process.argv.includes('--auto-close');
const childProcesses = new Map();
let stopping = false;

function title(text) {
  console.log('');
  console.log('============================================================');
  console.log(`  ${text}`);
  console.log('============================================================');
}

function pauseBeforeExit() {
  if (AUTO_CLOSE || !process.stdin.isTTY) {
    return;
  }

  console.log('');
  console.log('Press Enter to close this window.');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(process.exitCode ?? 0));
}

function isProjectRoot(candidate) {
  try {
    const packagePath = path.join(candidate, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    return (
      packageJson.name === 'qa-sentinel-tyra' &&
      fs.existsSync(path.join(candidate, 'scripts', 'qa-unattended.mjs')) &&
      fs.existsSync(path.join(candidate, 'scripts', 'serve-dashboard.mjs'))
    );
  } catch {
    return false;
  }
}

function findProjectRoot() {
  const executableDirectory = path.dirname(process.execPath);
  const candidates = [
    process.env.QA_SENTINEL_PROJECT_ROOT,
    executableDirectory,
    path.dirname(executableDirectory),
    process.cwd(),
    path.resolve(__dirname, '..'),
  ].filter(Boolean);

  return candidates.find(isProjectRoot);
}

function windowsCommand(command) {
  return spawnSync(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', command],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    }
  );
}

function commandAvailable(command) {
  const result = spawnSync(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', `where ${command}`],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: 'ignore',
      shell: false,
    }
  );

  return !result.error && result.status === 0;
}

function startWindowsCommand(label, command) {
  const child = spawn(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', command],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
      shell: false,
      windowsHide: false,
    }
  );

  childProcesses.set(label, child);

  child.once('error', error => {
    console.error(`[QA Sentinel] ${label} could not start: ${error.message}`);
    childProcesses.delete(label);
    stopAll(1);
  });

  child.once('exit', (code, signal) => {
    childProcesses.delete(label);

    if (!stopping) {
      const detail = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
      console.error(`[QA Sentinel] ${label} stopped unexpectedly (${detail}).`);
      stopAll(code ?? 1);
    }
  });

  return child;
}

function stopProcessTree(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGTERM');
}

function stopAll(code = 0) {
  if (stopping) {
    return;
  }

  stopping = true;
  process.exitCode = code;

  for (const child of childProcesses.values()) {
    stopProcessTree(child);
  }

  childProcesses.clear();
  process.exit(code);
}

function waitForUrl(url, timeoutMs = 30_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function tryRequest() {
      const request = http.get(url, response => {
        response.resume();

        if ((response.statusCode ?? 500) < 500) {
          resolve();
          return;
        }

        retry();
      });

      request.setTimeout(1_500, () => request.destroy());
      request.once('error', retry);
    }

    function retry() {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(tryRequest, 500);
    }

    tryRequest();
  });
}

function openBrowser(url) {
  spawn(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', 'start', '', url],
    {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }
  ).unref();
}

const projectRoot = findProjectRoot();

title('QA SENTINEL TYRA');

if (process.platform !== 'win32') {
  console.error('[QA Sentinel] This executable launcher is intended for Windows.');
  process.exitCode = 1;
  pauseBeforeExit();
  return;
}

if (!projectRoot) {
  console.error('[QA Sentinel] Could not find the QA Sentinel Tyra project.');
  console.error('Place the EXE in the project root or in its dist folder.');
  console.error('The project must contain package.json and scripts/qa-unattended.mjs.');
  process.exitCode = 1;
  pauseBeforeExit();
  return;
}

console.log(`[QA Sentinel] Project: ${projectRoot}`);

const missing = [];

if (!commandAvailable('node')) missing.push('Node.js');
if (!commandAvailable('npm')) missing.push('npm');
if (!fs.existsSync(path.join(projectRoot, 'node_modules', '@playwright', 'test'))) {
  missing.push('Playwright dependencies (run npm install)');
}

if (missing.length > 0) {
  console.error('[QA Sentinel] Missing requirements:');
  for (const item of missing) console.error(`  - ${item}`);
  console.error('');
  console.error('Run this once in the project folder:');
  console.error('  npm install');
  console.error('  npx playwright install chromium firefox webkit');
  process.exitCode = 1;
  pauseBeforeExit();
  return;
}

if (CHECK_ONLY) {
  console.log('[QA Sentinel] Launcher check passed.');
  console.log(`[QA Sentinel] Dashboard: ${DASHBOARD_URL}`);
  console.log(`[QA Sentinel] Playwright report: ${REPORT_URL}`);
  process.exit(0);
}

if (!SKIP_TESTS) {
  title('AUTOMATIC NEW QA RUN');
  console.log('[QA Sentinel] Scanning both configured sites and running qa:unattended.');
  console.log('[QA Sentinel] Findings may produce a non-zero test exit code.');
  console.log('[QA Sentinel] The generated evidence will still be opened afterwards.');

  const run = windowsCommand('npm run qa:unattended');

  if (run.error) {
    console.error(`[QA Sentinel] Could not start the QA run: ${run.error.message}`);
    process.exitCode = 1;
    pauseBeforeExit();
    return;
  }

  if ((run.status ?? 1) !== 0) {
    console.warn(
      `[QA Sentinel] The QA run finished with exit code ${run.status ?? 1}. Opening the generated findings.`
    );
  }

  title('SECURITY TESTING MODE');
  console.log(`[QA Sentinel] Mode: ${process.env.QA_PENTEST_MODE || 'production-safe'}`);
  console.log('[QA Sentinel] Generating the independent Security Testing Modes panel.');
  console.log('[QA Sentinel] External and active modes remain authorization-gated.');
  const pentestRun = windowsCommand('npm run qa:pentest');
  if (pentestRun.error || (pentestRun.status ?? 1) !== 0) {
    console.warn('[QA Sentinel] Pentest evidence could not be completed. The dashboard will show the coverage gap.');
  }
}

const dashboardData = path.join(projectRoot, 'dashboard', 'data', 'latest-run.json');
const reportIndex = path.join(projectRoot, 'playwright-report', 'index.html');

if (!fs.existsSync(dashboardData) || !fs.existsSync(reportIndex)) {
  console.error('[QA Sentinel] The run did not produce all required dashboard/report files.');
  console.error('Review the error output above, then run the launcher again.');
  process.exitCode = 1;
  pauseBeforeExit();
  return;
}

title('DASHBOARD AND PLAYWRIGHT REPORT');
console.log(`[QA Sentinel] Dashboard: ${DASHBOARD_URL}`);
console.log(`[QA Sentinel] Playwright report: ${REPORT_URL}`);
console.log('[QA Sentinel] Keep this window open. Press Ctrl+C to stop both servers.');

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));
process.once('SIGHUP', () => stopAll(0));

startWindowsCommand('Dashboard', 'npm run dashboard');
startWindowsCommand(
  'Playwright Report',
  'npm run report -- --host 127.0.0.1 --port 9323'
);

Promise.all([waitForUrl(DASHBOARD_URL), waitForUrl(REPORT_URL)])
  .then(() => {
    openBrowser(DASHBOARD_URL);
    console.log('[QA Sentinel] Dashboard and the single Playwright report page are ready.');
  })
  .catch(error => {
    console.error(`[QA Sentinel] ${error.message}`);
    stopAll(1);
  });
