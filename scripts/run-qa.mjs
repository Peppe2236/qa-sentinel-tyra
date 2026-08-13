import {
  spawn,
  spawnSync,
} from 'node:child_process';

import process from 'node:process';


function runPlaywright() {
  if (process.platform === 'win32') {
    const command =
      process.env.ComSpec ??
      'cmd.exe';

    return spawnSync(
      command,
      [
        '/d',
        '/s',
        '/c',
        'npx playwright test',
      ],
      {
        stdio: 'inherit',
        shell: false,
      }
    );
  }

  return spawnSync(
    'npx',
    [
      'playwright',
      'test',
    ],
    {
      stdio: 'inherit',
      shell: false,
    }
  );
}


function startDashboard() {
  const server = spawn(
    process.execPath,
    [
      'scripts/serve-dashboard.mjs',
    ],
    {
      detached: true,
      stdio: 'ignore',
    }
  );

  server.unref();

  const url =
    'http://localhost:4173';

  if (
    process.platform === 'win32'
  ) {
    spawn(
      process.env.ComSpec ??
        'cmd.exe',
      [
        '/d',
        '/s',
        '/c',
        `start "" "${url}"`,
      ],
      {
        detached: true,
        stdio: 'ignore',
      }
    ).unref();

    return;
  }

  if (
    process.platform === 'darwin'
  ) {
    spawn(
      'open',
      [url],
      {
        detached: true,
        stdio: 'ignore',
      }
    ).unref();

    return;
  }

  spawn(
    'xdg-open',
    [url],
    {
      detached: true,
      stdio: 'ignore',
    }
  ).unref();
}


console.log(
  '[QA Sentinel] Starting Playwright test run...'
);

const test =
  runPlaywright();

if (test.error) {
  console.error(
    '[QA Sentinel] Playwright could not be started.'
  );

  console.error(
    `[QA Sentinel] ${test.error.message}`
  );

  process.exitCode = 1;
} else {
  console.log(
    `[QA Sentinel] Playwright finished with exit code ${
      test.status ?? 1
    }.`
  );

  console.log(
    '[QA Sentinel] Starting dashboard server...'
  );

  startDashboard();

  /*
   * A non-zero Playwright exit code is preserved.
   *
   * Failed tests are valid QA evidence and the
   * reporter should still have generated the
   * dashboard artifacts before Playwright exits.
   */
  process.exitCode =
    test.status ?? 1;
}
