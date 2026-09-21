import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const dashboardScript = 'scripts/start-dashboard-with-auth.mjs';
const reportDirectory = 'playwright-report';
const dashboardUrl = 'http://127.0.0.1:4173';
const reportUrl = 'http://127.0.0.1:9323';
const checkOnly = process.argv.includes('--check');

function fail(message) {
  console.error(`[QA Sentinel] ${message}`);
  process.exit(1);
}

if (!existsSync(dashboardScript)) {
  fail(`Dashboard server saknas: ${dashboardScript}`);
}

if (!existsSync(`${reportDirectory}/index.html`)) {
  fail('No Playwright report was found. Run a QA test first.');
}

if (checkOnly) {
  console.log('[QA Sentinel] Local startup check passed.');
  console.log(`[QA Sentinel] Dashboard: ${dashboardUrl}`);
  console.log(`[QA Sentinel] Playwright Report: ${reportUrl}`);
  process.exit(0);
}

const children = new Map();
let stopping = false;
let exitCode = 0;

function finishIfStopped() {
  if (stopping && children.size === 0) {
    process.exit(exitCode);
  }
}

function stopAll(code = 0) {
  if (stopping) {
    return;
  }

  stopping = true;
  exitCode = code;

  for (const child of children.values()) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  finishIfStopped();
}

function startProcess(label, command, args) {
  let child;

  try {
    child = spawn(command, args, {
      shell: false,
      stdio: 'inherit',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[QA Sentinel] ${label} could not be started: ${message}`);
    stopAll(1);
    return;
  }

  children.set(label, child);

  child.once('error', error => {
    console.error(`[QA Sentinel] ${label} could not be started: ${error.message}`);
    children.delete(label);
    stopAll(1);
  });

  child.once('exit', (code, signal) => {
    children.delete(label);

    if (!stopping) {
      const detail = signal ? `signal ${signal}` : `kod ${code ?? 1}`;
      console.error(`[QA Sentinel] ${label} stannade (${detail}).`);
      stopAll(code ?? 1);
    }

    finishIfStopped();
  });
}

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));

console.log('[QA Sentinel] Startar lokal QA-miljo...');
console.log(`[QA Sentinel] Dashboard: ${dashboardUrl}`);
console.log(`[QA Sentinel] Playwright Report: ${reportUrl}`);
console.log('[QA Sentinel] Hall terminalen oppen. Avsluta bada med Ctrl+C.');

startProcess(
  'Dashboard',
  process.execPath,
  [dashboardScript]
);

if (process.platform === 'win32') {
  startProcess(
    'Playwright Report',
    process.env.ComSpec ?? 'cmd.exe',
    [
      '/d',
      '/s',
      '/c',
      `npx playwright show-report ${reportDirectory} --host 0.0.0.0 --port 9323`,
    ]
  );
} else {
  startProcess(
    'Playwright Report',
    'npx',
    [
      'playwright',
      'show-report',
      reportDirectory,
      '--host',
      '0.0.0.0',
      '--port',
      '9323',
    ]
  );
}
