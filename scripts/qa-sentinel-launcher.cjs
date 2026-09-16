const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const process = require('node:process');

const DASHBOARD_URL = 'http://127.0.0.1:4173/';
const REPORT_URL = 'http://127.0.0.1:9323/';
const CONTROL_HOST = '127.0.0.1';
const CONTROL_PORT = 4174;
const CHECK_ONLY = process.argv.includes('--check');
const AUTO_TEST_ON_START = process.argv.includes('--auto-test');
const SKIP_TESTS = process.argv.includes('--no-test') || !AUTO_TEST_ON_START;
const AUTO_CLOSE = process.argv.includes('--auto-close');
const serviceProcesses = new Map();
let controlServer = null;
let stopping = false;
let activeTask = null;

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

function windowsCommand(command, options = {}) {
  return spawnSync(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', command],
    {
      cwd: projectRoot,
      env: { ...process.env, ...(options.env || {}) },
      stdio: options.stdio || 'inherit',
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

function startWindowsService(label, command) {
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

  serviceProcesses.set(label, child);

  child.once('error', error => {
    console.error(`[QA Sentinel] ${label} could not start: ${error.message}`);
    serviceProcesses.delete(label);
    stopAll(1);
  });

  child.once('exit', (code, signal) => {
    serviceProcesses.delete(label);

    if (!stopping) {
      const detail = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
      console.error(`[QA Sentinel] ${label} stopped unexpectedly (${detail}).`);
      setWorkbenchState({
        overallStatus: 'error',
        phase: 'service-stopped',
        message: `${label} stopped unexpectedly (${detail}).`,
      });
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

  if (activeTask?.child) {
    stopProcessTree(activeTask.child);
    activeTask = null;
  }

  for (const child of serviceProcesses.values()) {
    stopProcessTree(child);
  }

  serviceProcesses.clear();

  if (controlServer) {
    try {
      controlServer.close();
    } catch {
      // no-op
    }
  }

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

function findEdgeCommand() {
  if (commandAvailable('msedge')) return 'msedge';
  if (commandAvailable('microsoft-edge')) return 'microsoft-edge';

  const candidates = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LocalAppData || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function openWorkbenchWindow(url) {
  const edgeCommand = findEdgeCommand();

  if (edgeCommand) {
    // Use an isolated Edge app profile so Windows/Edge does not reuse
    // a previously maximized browser window and ignore our Workbench size.
    const edgeProfileDir = path.join(
      process.env.LOCALAPPDATA || projectRoot,
      'QA-Sentinel-Tyra',
      'EdgeProfile'
    );

    fs.mkdirSync(edgeProfileDir, { recursive: true });

    spawn(edgeCommand, [
      `--app=${url}`,
      `--user-data-dir=${edgeProfileDir}`,
      '--new-window',
      '--window-size=1280,760',
      '--window-position=70,40',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--force-dark-mode',
      '--enable-features=WebUIDarkMode',
    ], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();

    return;
  }

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
const workbenchStatusPath = projectRoot
  ? path.join(projectRoot, 'dashboard', 'data', 'workbench-status.json')
  : null;
const reportIndexPath = projectRoot
  ? path.join(projectRoot, 'playwright-report', 'index.html')
  : null;

let playwrightVersion = null;
try {
  if (projectRoot) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    playwrightVersion = packageJson.devDependencies?.['@playwright/test'] || packageJson.dependencies?.['@playwright/test'] || null;
  }
} catch {
  playwrightVersion = null;
}

const workbenchState = {
  app: 'QA Sentinel Tyra Workbench',
  overallStatus: 'starting',
  phase: 'booting',
  message: 'Launcher is starting.',
  projectRoot: projectRoot || null,
  dashboardUrl: DASHBOARD_URL,
  reportUrl: REPORT_URL,
  controlUrl: `http://${CONTROL_HOST}:${CONTROL_PORT}/api/status`,
  dashboardReady: false,
  reportReady: false,
  reportAvailable: Boolean(reportIndexPath && fs.existsSync(reportIndexPath)),
  workbenchReady: false,
  busy: false,
  currentAction: null,
  lastAction: null,
  currentTarget: 'both',
  lastTarget: 'both',
  lastExitCode: null,
  lastQaAction: null,
  lastQaTarget: null,
  lastQaStartedAt: null,
  lastQaCompletedAt: null,
  lastQaExitCode: null,
  lastQaReportFresh: false,
  launchedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  playwrightVersion,
};

function writeWorkbenchState() {
  if (!workbenchStatusPath) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(workbenchStatusPath), { recursive: true });
    fs.writeFileSync(workbenchStatusPath, JSON.stringify(workbenchState, null, 2));
  } catch (error) {
    console.error(`[QA Sentinel] Could not write workbench status: ${error.message}`);
  }
}

function setWorkbenchState(patch) {
  Object.assign(workbenchState, patch, {
    updatedAt: new Date().toISOString(),
  });
  writeWorkbenchState();
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  response.end(JSON.stringify(payload, null, 2));
}

function startReportService() {
  if (serviceProcesses.has('Playwright Report')) {
    return true;
  }

  if (!reportIndexPath || !fs.existsSync(reportIndexPath)) {
    setWorkbenchState({
      reportReady: false,
      message: 'No Playwright report exists yet. Run QA first.',
    });
    return false;
  }

  startWindowsService(
    'Playwright Report',
    'node scripts/serve-playwright-report.mjs'
  );

  setWorkbenchState({
    reportReady: false,
    phase: 'starting-playwright-report',
    message: 'Starting Playwright report server on demand.',
  });

  waitForUrl(REPORT_URL, 20_000)
    .then(() => {
      setWorkbenchState({
        reportReady: true,
        overallStatus: activeTask ? 'running' : 'ready',
        phase: activeTask ? activeTask.action : 'playwright-report-ready',
        message: activeTask
          ? workbenchState.message
          : 'Playwright report is ready to open.',
      });
    })
    .catch(error => {
      setWorkbenchState({
        reportReady: false,
        overallStatus: 'warning',
        phase: 'playwright-report-failed',
        message: `Playwright report server could not start: ${error.message}`,
      });
    });

  return true;
}

function reportMtimeMs() {
  try {
    if (!reportIndexPath || !fs.existsSync(reportIndexPath)) return 0;
    return fs.statSync(reportIndexPath).mtimeMs || 0;
  } catch {
    return 0;
  }
}

function runTask(taskConfig) {
  if (activeTask) {
    return false;
  }

  const {
    action,
    label,
    command,
    nextTask,
    onStartMessage,
    onCompleteMessage,
    onFailureMessage,
    target = 'both',
  } = taskConfig;

  const isQaTask = action === 'run-full-qa' || action === 'fast-chromium';
  const taskStartedAt = new Date().toISOString();
  const taskStartedAtMs = Date.now();
  const reportMtimeBefore = isQaTask ? reportMtimeMs() : 0;

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

  activeTask = { action, label, command, child, target, taskStartedAt, taskStartedAtMs, reportMtimeBefore, isQaTask };
  setWorkbenchState({
    busy: true,
    currentAction: action,
    lastAction: action,
    currentTarget: target,
    lastTarget: target,
    ...(isQaTask ? {
      lastQaAction: action,
      lastQaTarget: target,
      lastQaStartedAt: taskStartedAt,
      lastQaCompletedAt: null,
      lastQaExitCode: null,
      lastQaReportFresh: false,
    } : {}),
    phase: action,
    message: onStartMessage || `${label} is running.`,
    overallStatus: 'running',
  });

  child.once('error', error => {
    activeTask = null;
    setWorkbenchState({
      busy: false,
      currentAction: null,
      currentTarget: null,
      lastExitCode: 1,
      ...(isQaTask ? {
        lastQaCompletedAt: new Date().toISOString(),
        lastQaExitCode: 1,
        lastQaReportFresh: false,
      } : {}),
      overallStatus: 'error',
      phase: `${action}-failed`,
      message: `${label} could not start: ${error.message}`,
    });
  });

  child.once('exit', code => {
    activeTask = null;

    const reportMtimeAfter = isQaTask ? reportMtimeMs() : 0;
    const qaReportFresh = isQaTask && reportMtimeAfter > 0 && (
      reportMtimeAfter > reportMtimeBefore || reportMtimeAfter >= taskStartedAtMs
    );
    const qaCompletedAt = isQaTask ? new Date().toISOString() : null;

    setWorkbenchState({
      reportReady: false,
      reportAvailable: Boolean(reportIndexPath && fs.existsSync(reportIndexPath)),
      ...(isQaTask ? {
        lastQaCompletedAt: qaCompletedAt,
        lastQaExitCode: code ?? 1,
        lastQaReportFresh: qaReportFresh,
      } : {}),
    });

    if (stopping) {
      return;
    }

    if ((code ?? 1) !== 0) {
      setWorkbenchState({
        busy: false,
        currentAction: null,
        currentTarget: null,
        lastExitCode: code ?? 1,
        overallStatus: 'warning',
        phase: `${action}-completed-with-findings`,
        message: onFailureMessage || `${label} finished with exit code ${code ?? 1}. Review the generated findings.`,
      });
      return;
    }

    if (nextTask) {
      setWorkbenchState({
        busy: false,
        currentAction: null,
        currentTarget: null,
        lastExitCode: 0,
        overallStatus: 'running',
        phase: `${action}-complete`,
        message: onCompleteMessage || `${label} finished successfully.`,
      });

      setTimeout(() => runTask(nextTask), 500);
      return;
    }

    setWorkbenchState({
      busy: false,
      currentAction: null,
      currentTarget: null,
      lastExitCode: 0,
      overallStatus: 'ready',
      phase: `${action}-complete`,
      message: onCompleteMessage || `${label} finished successfully.`,
    });
  });

  return true;
}

function normalizeTarget(value) {
  return ['both', 'nation', 'skills'].includes(value) ? value : 'both';
}

function targetLabel(target) {
  if (target === 'nation') return 'Nation';
  if (target === 'skills') return 'AI Skills';
  return 'Nation + AI Skills';
}

function queueAction(action, requestedTarget = 'both') {
  const target = normalizeTarget(requestedTarget);
  if (action === 'open-playwright-report') {
    const started = startReportService();
    return started
      ? { ok: true, statusCode: 202, message: 'Playwright report server is starting.' }
      : { ok: false, statusCode: 404, message: 'No Playwright report exists yet. Run QA first.' };
  }

  if (activeTask) {
    return {
      ok: false,
      statusCode: 409,
      message: `${activeTask.label} is already running.`,
    };
  }

  const actions = {
    'run-full-qa': {
      action: 'run-full-qa',
      label: target === 'both' ? 'Full QA' : `${targetLabel(target)} scoped QA`,
      target,
      command: target === 'nation'
        ? 'npm run scan:nation && npm run qa:nation'
        : target === 'skills'
          ? 'npm run scan:skills && npm run qa:skills'
          : 'npm run qa:unattended',
      onStartMessage: target === 'both'
        ? 'Full QA is running across Nation and AI Skills.'
        : `${targetLabel(target)} scoped QA is running.`,
      onCompleteMessage: `${targetLabel(target)} QA finished. Review the refreshed dashboard and reports.`,
      onFailureMessage: `${targetLabel(target)} QA completed with findings or a non-zero exit code. Review the generated evidence.`,
    },
    'fast-chromium': {
      action: 'fast-chromium',
      label: `Fast Chromium — ${targetLabel(target)}`,
      target,
      command: target === 'nation'
        ? 'npm run qa:nation'
        : target === 'skills'
          ? 'npm run qa:skills'
          : 'npm run qa:sites',
      onStartMessage: `Fast Chromium is running for ${targetLabel(target)}.`,
      onCompleteMessage: `Fast Chromium finished for ${targetLabel(target)}. Latest data has been refreshed.`,
      onFailureMessage: `Fast Chromium for ${targetLabel(target)} finished with findings or a non-zero exit code.`,
    },
    'security-production': {
      action: 'security-production',
      label: 'Production Safe Security',
      command: 'npm run qa:pentest:production',
      onStartMessage: 'Production Safe security mode is running.',
      onCompleteMessage: 'Production Safe security evidence has been refreshed.',
      onFailureMessage: 'Production Safe security mode did not complete cleanly. Review pentest evidence.',
    },
    'security-staging': {
      action: 'security-staging',
      label: 'Staging Active Security',
      command: 'npm run qa:pentest:staging',
      onStartMessage: 'Staging Active security mode is running. Ensure authorization and allowlisting are configured.',
      onCompleteMessage: 'Staging Active security evidence has been refreshed.',
      onFailureMessage: 'Staging Active security mode did not complete cleanly. Review pentest evidence and guardrails.',
    },
    'security-manual': {
      action: 'security-manual',
      label: 'Manual Validation',
      command: 'npm run qa:pentest:manual',
      onStartMessage: 'Manual Validation checklist generation is running.',
      onCompleteMessage: 'Manual Validation guidance has been refreshed.',
      onFailureMessage: 'Manual Validation did not complete cleanly. Review pentest evidence.',
    },
  };

  const config = actions[action];

  if (!config) {
    return {
      ok: false,
      statusCode: 404,
      message: `Unknown action: ${action}`,
    };
  }

  runTask(config);
  return { ok: true, statusCode: 202, message: `${config.label} started.` };
}

function startControlServer() {
  controlServer = http.createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${CONTROL_HOST}:${CONTROL_PORT}`);

    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/status') {
      sendJson(response, 200, workbenchState);
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/action/')) {
      const action = url.pathname.slice('/api/action/'.length);
      const target = normalizeTarget(url.searchParams.get('target') || 'both');
      const result = queueAction(action, target);
      sendJson(response, result.statusCode, result);
      return;
    }

    sendJson(response, 404, {
      ok: false,
      message: 'Not found.',
    });
  });

  controlServer.on('error', error => {
    console.error(`[QA Sentinel] Control API error: ${error.message}`);
    stopAll(1);
  });

  controlServer.listen(CONTROL_PORT, CONTROL_HOST, () => {
    console.log(`[QA Sentinel] Workbench control API: http://${CONTROL_HOST}:${CONTROL_PORT}/api/status`);
    setWorkbenchState({ workbenchReady: true });
  });
}

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
writeWorkbenchState();

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
  setWorkbenchState({
    overallStatus: 'ready',
    phase: 'check-only',
    message: 'Launcher check passed.',
  });
  console.log('[QA Sentinel] Launcher check passed.');
  console.log(`[QA Sentinel] Dashboard: ${DASHBOARD_URL}`);
  console.log(`[QA Sentinel] Playwright report: ${REPORT_URL}`);
  process.exit(0);
}

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));
process.once('SIGHUP', () => stopAll(0));

setWorkbenchState({
  overallStatus: 'starting',
  phase: 'starting-dashboard',
  message: 'Starting dashboard service.',
});

startWindowsService('Dashboard', 'npm run dashboard');
startControlServer();

waitForUrl(DASHBOARD_URL)
  .then(() => {
    setWorkbenchState({
      dashboardReady: true,
      overallStatus: 'ready',
      phase: 'dashboard-ready',
      message: 'Workbench is ready. Playwright remains closed until you open it from Workbench.',
    });

    openWorkbenchWindow(DASHBOARD_URL);

    title('WORKBENCH READY');
    console.log(`[QA Sentinel] Workbench: ${DASHBOARD_URL}`);
    console.log('[QA Sentinel] Opening a single app-like Edge window without the normal address bar.');
    console.log('[QA Sentinel] Playwright Report will open only when you select it inside the workbench.');
    console.log('[QA Sentinel] Automatic QA is disabled on normal startup. Use --auto-test only when you explicitly want Full QA to begin immediately.');
    console.log('[QA Sentinel] Keep this window open. Press Ctrl+C to stop the background services.');

    if (!SKIP_TESTS) {
      setTimeout(() => {
        queueAction('run-full-qa');
      }, 500);
    } else {
      setWorkbenchState({
        overallStatus: 'ready',
        phase: 'idle',
        message: 'Workbench is ready. Automatic QA is disabled on startup. Start a run from Workbench when you are ready.',
      });
    }
  })
  .catch(error => {
    console.error(`[QA Sentinel] ${error.message}`);
    setWorkbenchState({
      overallStatus: 'error',
      phase: 'dashboard-timeout',
      message: error.message,
    });
    stopAll(1);
  });
