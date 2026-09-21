import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const latestRun =
  path.resolve(
    'dashboard',
    'data',
    'latest-run.json'
  );

const beforeMtime =
  fs.existsSync(latestRun)
    ? fs.statSync(latestRun).mtimeMs
    : 0;

console.log(
  '[QA Sentinel] Starting Full QA core...'
);

let qa;

if (process.platform === 'win32') {
  qa = spawnSync(
    process.env.ComSpec || 'cmd.exe',
    [
      '/d',
      '/s',
      '/c',
      'npm run qa:unattended:core',
    ],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );
} else {
  qa = spawnSync(
    'npm',
    [
      'run',
      'qa:unattended:core',
    ],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );
}

if (qa.error) {
  console.error(
    '[QA Sentinel] Full QA could not start:',
    qa.error.message
  );

  process.exit(1);
}

const afterMtime =
  fs.existsSync(latestRun)
    ? fs.statSync(latestRun).mtimeMs
    : 0;

if (
  afterMtime <= beforeMtime
) {
  console.error('');
  console.error(
    '[QA Sentinel] Full QA did not produce a new latest-run.json.'
  );

  console.error(
    '[QA Sentinel] Refusing to generate a failure report from stale data.'
  );

  process.exit(
    qa.status ?? 1
  );
}

console.log('');
console.log(
  '[QA Sentinel] Generating Failed Playwright Report...'
);

const report =
  spawnSync(
    process.execPath,
    [
      'scripts/generate-failed-playwright-report.mjs',
    ],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );

if (report.error) {
  console.error(
    '[QA Sentinel] Report generator could not start:',
    report.error.message
  );
}

const reportFailed =
  Boolean(report.error) ||
  report.status !== 0;

if (reportFailed) {
  console.error(
    '[QA Sentinel] Failed Playwright Report generation failed.'
  );

  /*
   * Preserve the QA failure code when QA itself failed.
   * If QA succeeded but report generation failed, return failure.
   */
  if ((qa.status ?? 0) === 0) {
    process.exit(
      report.status ?? 1
    );
  }
}

process.exit(
  qa.status ?? 1
);
