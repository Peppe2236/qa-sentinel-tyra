const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const process = require('node:process');

const DASHBOARD_URL = 'http://127.0.0.1:4173/';
const WORKBENCH_APP_URL = `${DASHBOARD_URL}?tyra-desktop=1&v=73`;
const REPORT_URL = 'http://127.0.0.1:9323/';
const CONTROL_HOST = '127.0.0.1';
const CONTROL_PORT = 4174;
const CONTROL_URL = `http://${CONTROL_HOST}:${CONTROL_PORT}/api/status`;
const CHECK_ONLY = process.argv.includes('--check');
const AUTO_TEST_ON_START = process.argv.includes('--auto-test');
const SKIP_TESTS = process.argv.includes('--no-test') || !AUTO_TEST_ON_START;
const AUTO_CLOSE = process.argv.includes('--auto-close');
const SMOKE_STARTUP = process.argv.includes('--smoke-startup');
const SMOKE_TASK_LAUNCH = process.argv.includes('--smoke-task-launch');
const serviceProcesses = new Map();
let controlServer = null;
let stopping = false;
let activeTask = null;
let workbenchWindowProcess = null;
let edgeLifetimeMonitor = null;
let ownsInstanceLock = false;

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

function appendBackgroundLog(label, chunk) {
  if (!projectRoot || !chunk) return;
  try {
    const logDir = path.join(projectRoot, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const safeLabel = String(label).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    const line = `[${new Date().toISOString()}] ${String(chunk)}`;
    fs.appendFileSync(path.join(logDir, `workbench-${safeLabel}.log`), line);
  } catch {
    // Logging must never stop the Workbench.
  }
}

function pipeBackgroundOutput(child, label) {
  child.stdout?.on('data', chunk => appendBackgroundLog(label, chunk));
  child.stderr?.on('data', chunk => appendBackgroundLog(label, chunk));
}

function startWindowsService(label, command) {
  const child = spawn(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', command],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    }
  );

  pipeBackgroundOutput(child, label);
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

function resolveNodeExecutable() {
  if (process.platform !== 'win32') return 'node';

  const result = spawnSync('where.exe', ['node.exe'], {
    cwd: projectRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
    shell: false,
  });

  const found = String(result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && /node\.exe$/i.test(line));

  return found || 'node.exe';
}


function resolveNpmCli() {
  const nodeExecutable = resolveNodeExecutable();
  const candidates = [];

  if (process.platform === 'win32') {
    const result = spawnSync('where.exe', ['npm.cmd'], {
      cwd: projectRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      shell: false,
    });

    for (const line of String(result.stdout || '').split(/\r?\n/)) {
      const npmCmd = line.trim();
      if (!npmCmd) continue;
      candidates.push(path.join(path.dirname(npmCmd), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
    }

    candidates.push(path.join(path.dirname(nodeExecutable), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return { nodeExecutable, npmCliPath: candidate };
    }
  }

  return null;
}

function runNpmCliSync(args, options = {}) {
  const resolved = resolveNpmCli();
  if (!resolved) {
    return {
      error: new Error('Could not resolve npm-cli.js from the installed Node.js runtime.'),
      status: 1,
      stdout: '',
      stderr: '',
    };
  }

  return spawnSync(resolved.nodeExecutable, [resolved.npmCliPath, ...args], {
    cwd: projectRoot,
    env: { ...process.env, ...(options.env || {}) },
    encoding: options.encoding || 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false,
  });
}

function psSingleQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function safeTaskFileName(value) {
  return String(value || 'task')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'task';
}

function spawnNpmScript(scriptName, label) {
  const resolved = resolveNpmCli();
  if (!resolved) {
    throw new Error('Could not resolve npm-cli.js from the installed Node.js runtime.');
  }

  const runtimeRoot = path.join(process.env.LOCALAPPDATA || projectRoot, 'QA-Sentinel-Tyra');
  const runnerDirectory = path.join(runtimeRoot, 'TaskRunners');
  fs.mkdirSync(runnerDirectory, { recursive: true });

  const displayLabel = label || scriptName;
  const runnerPath = path.join(
    runnerDirectory,
    `${Date.now()}-${safeTaskFileName(scriptName)}.ps1`
  );

  const runnerScript = [
    '$ErrorActionPreference = \'Continue\'',
    `try { $Host.UI.RawUI.WindowTitle = ${psSingleQuote(`QA Sentinel Tyra - ${displayLabel}`)} } catch {}`,
    `Set-Location -LiteralPath ${psSingleQuote(projectRoot)}`,
    "Write-Host ''",
    "Write-Host '============================================================' -ForegroundColor DarkCyan",
    `Write-Host ${psSingleQuote(`  QA Sentinel Tyra - ${displayLabel}`)} -ForegroundColor Cyan`,
    "Write-Host '============================================================' -ForegroundColor DarkCyan",
    `Write-Host ${psSingleQuote(`Running: npm run ${scriptName}`)} -ForegroundColor Gray`,
    "Write-Host ''",
    `& ${psSingleQuote(resolved.nodeExecutable)} ${psSingleQuote(resolved.npmCliPath)} 'run' ${psSingleQuote(scriptName)}`,
    '$tyraExitCode = $LASTEXITCODE',
    "Write-Host ''",
    "if ($tyraExitCode -eq 0) {",
    "  Write-Host '[QA Sentinel Tyra] Task completed.' -ForegroundColor Green",
    "} else {",
    "  Write-Host ('[QA Sentinel Tyra] Task finished with exit code ' + $tyraExitCode + '.') -ForegroundColor Yellow",
    "}",
    "Start-Sleep -Milliseconds 1200",
    'exit $tyraExitCode',
    '',
  ].join('\r\n');

  fs.writeFileSync(runnerPath, runnerScript, 'utf8');

  appendBackgroundLog(
    'launcher',
    `Starting visible task console for ${displayLabel} (npm run ${scriptName}).\n`
  );

  // The packaged launcher is a Windows GUI application, so its own console stays hidden.
  // A hidden wrapper PowerShell uses Start-Process to create a normal visible PowerShell
  // task window. The wrapper waits for it and returns the real npm exit code to Workbench.
  const wrapperCommand = [
    `$p = Start-Process -FilePath 'powershell.exe'`,
    `-ArgumentList @('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',${psSingleQuote(runnerPath)})`,
    `-WorkingDirectory ${psSingleQuote(projectRoot)}`,
    '-WindowStyle Normal -Wait -PassThru;',
    'exit $p.ExitCode',
  ].join(' ');

  const child = spawn(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', wrapperCommand],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    }
  );

  child.once('exit', () => {
    try { fs.rmSync(runnerPath, { force: true }); } catch {}
  });

  return child;
}

function startNodeService(label, relativeScriptPath, args = []) {
  const scriptPath = path.join(projectRoot, relativeScriptPath);

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`${label} script not found: ${scriptPath}`);
  }

  // IMPORTANT: never start the dashboard through npm/cmd/Windows Terminal.
  // node.exe is launched directly and hidden. This makes the first EXE click
  // behave like a real desktop application instead of exposing a terminal.
  const nodeExecutable = resolveNodeExecutable();
  const child = spawn(nodeExecutable, [scriptPath, ...args], {
    cwd: projectRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
  });

  pipeBackgroundOutput(child, label);
  serviceProcesses.set(label, child);

  child.once('error', error => {
    appendBackgroundLog('launcher', `${label} could not start: ${error.message}\n`);
    serviceProcesses.delete(label);
    if (!stopping) stopAll(1);
  });

  child.once('exit', (code, signal) => {
    serviceProcesses.delete(label);

    if (!stopping) {
      const detail = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
      appendBackgroundLog('launcher', `${label} stopped unexpectedly (${detail}).\n`);
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

  if (edgeLifetimeMonitor) {
    clearInterval(edgeLifetimeMonitor);
    edgeLifetimeMonitor = null;
  }

  if (controlServer) {
    try {
      controlServer.close();
    } catch {
      // no-op
    }
  }

  releaseInstanceLock();
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

function edgeAppProcessIds(url) {
  if (process.platform !== 'win32') return [];

  try {
    const escaped = String(`--app=${url}`).replace(/'/g, "''");
    const script = [
      `$needle = '${escaped}'`,
      `$items = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 } | Select-Object -ExpandProperty ProcessId`,
      `$items | ForEach-Object { Write-Output $_ }`,
    ].join('; ');

    const result = spawnSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script,
    ], {
      cwd: projectRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      shell: false,
      timeout: 5_000,
    });

    return String(result.stdout || '')
      .split(/\r?\n/)
      .map(line => Number.parseInt(line.trim(), 10))
      .filter(Number.isFinite);
  } catch {
    return [];
  }
}

function startEdgeLifetimeMonitor(url) {
  if (edgeLifetimeMonitor) {
    clearInterval(edgeLifetimeMonitor);
    edgeLifetimeMonitor = null;
  }

  let appSeen = false;
  let consecutiveMisses = 0;
  let checks = 0;

  const check = () => {
    if (stopping) return;

    checks += 1;
    const pids = edgeAppProcessIds(url);

    if (pids.length > 0) {
      appSeen = true;
      consecutiveMisses = 0;
      return;
    }

    if (!appSeen) {
      // With the user's normal Edge profile, Edge may hand the --app request
      // to an already-running browser process whose command line does not keep
      // the original --app argument. In that case we deliberately keep the
      // QA backend alive instead of falsely assuming the Workbench was closed.
      if (checks >= 10) {
        appendBackgroundLog('launcher', 'Edge app window could not be tied to a dedicated process; backend will remain alive for stable desktop startup.\n');
        clearInterval(edgeLifetimeMonitor);
        edgeLifetimeMonitor = null;
      }
      return;
    }

    consecutiveMisses += 1;
    if (consecutiveMisses >= 3) {
      appendBackgroundLog('launcher', 'QA Sentinel Edge app window closed; stopping background services.\n');
      clearInterval(edgeLifetimeMonitor);
      edgeLifetimeMonitor = null;
      stopAll(0);
    }
  };

  setTimeout(check, 1_500);
  edgeLifetimeMonitor = setInterval(check, 3_000);
}

function openWorkbenchWindow(url, { trackLifetime = true } = {}) {
  const edgeCommand = findEdgeCommand();
  const appUrl = url === DASHBOARD_URL ? WORKBENCH_APP_URL : url;

  if (edgeCommand) {
    const child = spawn(edgeCommand, [
      `--app=${appUrl}`,
      '--new-window',
      '--window-size=1280,760',
      '--window-position=70,40',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--disable-background-mode',
    ], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    // V7 intentionally uses the user's normal Edge profile. The isolated
    // --user-data-dir profile repeatedly produced a blank/grey Workbench on
    // first launch even though Dashboard/API and all frontend assets returned
    // HTTP 200. Normal Edge rendered the same dashboard correctly, so the
    // profile isolation was the failing layer and is removed here.
    child.once('exit', (code, signal) => {
      workbenchWindowProcess = null;
      appendBackgroundLog(
        'launcher',
        `Edge bootstrap process exited (${signal ? `signal ${signal}` : `code ${code ?? 0}`}); backend remains alive.\n`
      );
    });

    child.unref();

    if (trackLifetime) {
      workbenchWindowProcess = child;
      startEdgeLifetimeMonitor(appUrl);
    }

    return child;
  }

  const child = spawn(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', 'start', '', appUrl],
    {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }
  );
  child.unref();
  return child;
}

const projectRoot = findProjectRoot();
const workbenchStatusPath = projectRoot
  ? path.join(projectRoot, 'dashboard', 'data', 'workbench-status.json')
  : null;
const reportIndexPath = projectRoot
  ? path.join(projectRoot, 'playwright-report', 'index.html')
  : null;
const runtimeDir = projectRoot
  ? path.join(process.env.LOCALAPPDATA || projectRoot, 'QA-Sentinel-Tyra')
  : null;
const instanceLockPath = runtimeDir ? path.join(runtimeDir, 'launcher.lock') : null;

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processCommandLine(pid) {
  if (process.platform !== 'win32' || !Number.isInteger(pid) || pid <= 0) return '';
  try {
    const escaped = String(pid).replace(/[^0-9]/g, '');
    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${escaped}").CommandLine`],
      {
        cwd: projectRoot,
        env: process.env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
        shell: false,
      }
    );
    return String(result.stdout || '').trim();
  } catch {
    return '';
  }
}

function isQaSentinelLauncherProcess(pid) {
  if (!isPidAlive(pid)) return false;
  const commandLine = processCommandLine(pid).toLowerCase();
  if (!commandLine) return false;
  return commandLine.includes('qa-sentinel-tyra.exe') ||
    commandLine.includes('qa-sentinel-tyra.raw.exe') ||
    commandLine.includes('qa-sentinel-launcher.cjs');
}

function acquireInstanceLock() {
  if (!instanceLockPath) return true;
  fs.mkdirSync(path.dirname(instanceLockPath), { recursive: true });

  try {
    if (fs.existsSync(instanceLockPath)) {
      const previousPid = Number.parseInt(fs.readFileSync(instanceLockPath, 'utf8').trim(), 10);
      if (isQaSentinelLauncherProcess(previousPid)) {
        return false;
      }

      // Stale lock: PID is gone or has been recycled by an unrelated process.
      appendBackgroundLog('launcher', `Removing stale launcher lock for PID ${previousPid || 'unknown'}.\n`);
      fs.rmSync(instanceLockPath, { force: true });
    }

    fs.writeFileSync(instanceLockPath, String(process.pid), { flag: 'wx' });
    ownsInstanceLock = true;
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    appendBackgroundLog('launcher', `Instance lock warning: ${error.message}\n`);
    return true;
  }
}

function releaseInstanceLock() {
  if (!ownsInstanceLock || !instanceLockPath) return;
  try {
    const current = fs.existsSync(instanceLockPath)
      ? Number.parseInt(fs.readFileSync(instanceLockPath, 'utf8').trim(), 10)
      : null;
    if (current === process.pid) fs.rmSync(instanceLockPath, { force: true });
  } catch {
    // no-op
  }
  ownsInstanceLock = false;
}

function readInstanceLockPid() {
  if (!instanceLockPath) return null;
  try {
    if (!fs.existsSync(instanceLockPath)) return null;
    const pid = Number.parseInt(fs.readFileSync(instanceLockPath, 'utf8').trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function removeInstanceLockRegardless() {
  if (!instanceLockPath) return;
  try {
    fs.rmSync(instanceLockPath, { force: true });
  } catch {
    // no-op
  }
}

function restartSelfAfterUnhealthyInstance(previousPid) {
  appendBackgroundLog('launcher', `Recovering unhealthy existing launcher PID ${previousPid || 'unknown'}.\n`);

  if (previousPid && previousPid !== process.pid && isQaSentinelLauncherProcess(previousPid)) {
    try {
      spawnSync('taskkill', ['/pid', String(previousPid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      // Continue with lock cleanup even if taskkill fails.
    }
  }

  removeInstanceLockRegardless();

  const child = spawn(process.execPath, process.argv.slice(1), {
    cwd: projectRoot,
    env: process.env,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  process.exit(0);
}

process.once('exit', releaseInstanceLock);

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
  controlUrl: CONTROL_URL,
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

  startNodeService(
    'Playwright Report',
    path.join('scripts', 'serve-playwright-report.mjs')
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
    steps = [],
    nextTask,
    onStartMessage,
    onCompleteMessage,
    onFailureMessage,
    target = 'both',
  } = taskConfig;

  if (!Array.isArray(steps) || steps.length === 0) {
    setWorkbenchState({
      busy: false,
      currentAction: null,
      currentTarget: null,
      lastExitCode: 1,
      overallStatus: 'error',
      phase: `${action}-failed`,
      message: `${label} has no executable task steps configured.`,
    });
    return false;
  }

  const isQaTask = action === 'run-full-qa' || action === 'fast-chromium';
  const taskStartedAt = new Date().toISOString();
  const taskStartedAtMs = Date.now();
  const reportMtimeBefore = isQaTask ? reportMtimeMs() : 0;

  activeTask = {
    action,
    label,
    steps,
    child: null,
    stepIndex: 0,
    target,
    taskStartedAt,
    taskStartedAtMs,
    reportMtimeBefore,
    isQaTask,
  };

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

  appendBackgroundLog(
    'launcher',
    `Action ${action} accepted for target=${target}. Steps: ${steps.map(step => step.script).join(' -> ')}\n`
  );

  const finish = (code) => {
    const reportMtimeAfter = isQaTask ? reportMtimeMs() : 0;
    const qaReportFresh = isQaTask && reportMtimeAfter > 0 && (
      reportMtimeAfter > reportMtimeBefore || reportMtimeAfter >= taskStartedAtMs
    );
    const qaCompletedAt = isQaTask ? new Date().toISOString() : null;

    activeTask = null;

    setWorkbenchState({
      reportReady: false,
      reportAvailable: Boolean(reportIndexPath && fs.existsSync(reportIndexPath)),
      ...(isQaTask ? {
        lastQaCompletedAt: qaCompletedAt,
        lastQaExitCode: code ?? 1,
        lastQaReportFresh: qaReportFresh,
      } : {}),
    });

    if (stopping) return;

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
  };

  const runStep = (index) => {
    if (!activeTask || stopping) return;

    if (index >= steps.length) {
      finish(0);
      return;
    }

    const step = steps[index];
    activeTask.stepIndex = index;

    const stepLabel = step.label || step.script;
    setWorkbenchState({
      phase: action,
      message: steps.length > 1
        ? `${onStartMessage || `${label} is running.`} Step ${index + 1}/${steps.length}: ${stepLabel}`
        : (onStartMessage || `${label} is running.`),
    });

    let child;
    try {
      child = spawnNpmScript(step.script, `${label} / ${stepLabel}`);
    } catch (error) {
      appendBackgroundLog('launcher', `Action ${action} could not start step ${step.script}: ${error.message}\n`);
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
      return;
    }

    activeTask.child = child;
    pipeBackgroundOutput(child, `task-${action}`);

    child.once('error', error => {
      if (!activeTask) return;
      appendBackgroundLog('launcher', `Action ${action} child error: ${error.message}\n`);
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
      if (!activeTask || stopping) return;

      appendBackgroundLog(
        'launcher',
        `Action ${action} step ${step.script} exited with code ${code ?? 1}.\n`
      );

      if ((code ?? 1) !== 0) {
        finish(code ?? 1);
        return;
      }

      runStep(index + 1);
    });
  };

  runStep(0);
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
      steps: target === 'nation'
        ? [
            { script: 'scan:nation', label: 'Discover Nation pages' },
            { script: 'qa:nation', label: 'Run Nation QA' },
          ]
        : target === 'skills'
          ? [
              { script: 'scan:skills', label: 'Discover AI Skills pages' },
              { script: 'qa:skills', label: 'Run AI Skills QA' },
            ]
          : [
              { script: 'qa:unattended', label: 'Run full unattended QA' },
            ],
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
      steps: target === 'nation'
        ? [{ script: 'qa:nation', label: 'Run Nation Chromium QA' }]
        : target === 'skills'
          ? [{ script: 'qa:skills', label: 'Run AI Skills Chromium QA' }]
          : [{ script: 'qa:sites', label: 'Run both sites Chromium QA' }],
      onStartMessage: `Fast Chromium is running for ${targetLabel(target)}.`,
      onCompleteMessage: `Fast Chromium finished for ${targetLabel(target)}. Latest data has been refreshed.`,
      onFailureMessage: `Fast Chromium for ${targetLabel(target)} finished with findings or a non-zero exit code.`,
    },
    'security-production': {
      action: 'security-production',
      label: 'Production Safe Security',
      steps: [{ script: 'qa:pentest:production', label: 'Production Safe security checks' }],
      onStartMessage: 'Production Safe security mode is running.',
      onCompleteMessage: 'Production Safe security evidence has been refreshed.',
      onFailureMessage: 'Production Safe security mode did not complete cleanly. Review pentest evidence.',
    },
    'security-staging': {
      action: 'security-staging',
      label: 'Staging Active Security',
      steps: [{ script: 'qa:pentest:staging', label: 'Staging Active security checks' }],
      onStartMessage: 'Staging Active security mode is running. Ensure authorization and allowlisting are configured.',
      onCompleteMessage: 'Staging Active security evidence has been refreshed.',
      onFailureMessage: 'Staging Active security mode did not complete cleanly. Review pentest evidence and guardrails.',
    },
    'security-manual': {
      action: 'security-manual',
      label: 'Manual Validation',
      steps: [{ script: 'qa:pentest:manual', label: 'Manual validation checklist' }],
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

  const started = runTask(config);
  if (!started) {
    return {
      ok: false,
      statusCode: 500,
      message: `${config.label} could not be started. Check the Workbench launcher log.`,
    };
  }
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


if (SMOKE_TASK_LAUNCH) {
  const npmProbe = runNpmCliSync(['--version']);
  if (npmProbe.error || npmProbe.status !== 0) {
    appendBackgroundLog(
      'launcher',
      `Packaged task-launch smoke test failed: ${npmProbe.error?.message || npmProbe.stderr || `exit ${npmProbe.status}`}\n`
    );
    process.exit(1);
  }

  appendBackgroundLog(
    'launcher',
    `Packaged task-launch smoke test passed with npm ${String(npmProbe.stdout || '').trim()}.\n`
  );
  process.exit(0);
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

if (!acquireInstanceLock()) {
  // A verified QA Sentinel launcher is already running. Only open another
  // Workbench window after BOTH local services are actually reachable.
  const previousPid = readInstanceLockPid();
  Promise.all([
    waitForUrl(DASHBOARD_URL, 10_000),
    waitForUrl(CONTROL_URL, 10_000),
  ])
    .then(() => {
      if (SMOKE_STARTUP) {
        process.exit(0);
        return;
      }
      openWorkbenchWindow(DASHBOARD_URL, { trackLifetime: false });
      process.exit(0);
    })
    .catch(error => {
      // Do not open a dead 127.0.0.1 page. Recover the unhealthy old launcher
      // automatically and relaunch once with a clean instance lock.
      appendBackgroundLog('launcher', `Existing instance unhealthy: ${error.message}\n`);
      restartSelfAfterUnhealthyInstance(previousPid);
    });
  return;
}

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));
process.once('SIGHUP', () => stopAll(0));

setWorkbenchState({
  overallStatus: 'starting',
  phase: 'starting-dashboard',
  message: 'Starting hidden dashboard and control services.',
});

startNodeService('Dashboard', path.join('scripts', 'serve-dashboard.mjs'));
startControlServer();

Promise.all([
  waitForUrl(DASHBOARD_URL),
  waitForUrl(CONTROL_URL),
])
  .then(() => {
    setWorkbenchState({
      dashboardReady: true,
      overallStatus: 'ready',
      phase: 'dashboard-ready',
      message: 'Workbench is ready. Playwright remains closed until you open it from Workbench.',
    });

    if (SMOKE_STARTUP) {
      setWorkbenchState({
        overallStatus: 'ready',
        phase: 'smoke-startup-passed',
        message: 'Packaged startup smoke test passed.',
      });
      setTimeout(() => stopAll(0), 150);
      return;
    }

    openWorkbenchWindow(DASHBOARD_URL);

    title('WORKBENCH READY');
    console.log(`[QA Sentinel] Workbench: ${DASHBOARD_URL}`);
    console.log('[QA Sentinel] Opening a single app-like Edge window through the normal Edge profile.');
    console.log('[QA Sentinel] Playwright Report will open only when you select it inside the workbench.');
    console.log('[QA Sentinel] Automatic QA is disabled on normal startup. Use --auto-test only when you explicitly want Full QA to begin immediately.');
    console.log('[QA Sentinel] Desktop mode is active; Dashboard starts directly through Node with no npm/CMD window.');
    console.log('[QA Sentinel] Workbench opens only after both Dashboard and Control API are ready.');

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
