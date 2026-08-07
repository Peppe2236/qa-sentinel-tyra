import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();

const dashboardUrl = 'http://127.0.0.1:4173';
const executiveReportUrl =
  'http://127.0.0.1:4173/reports/latest-report.html';

const latestRunFile = path.join(
  projectRoot,
  'dashboard',
  'data',
  'latest-run.json'
);

/*
 * ============================================================
 * COLORS
 * ============================================================
 */

const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  blue: '\x1b[94m',
  cyan: '\x1b[96m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  red: '\x1b[91m',
  magenta: '\x1b[95m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
};

/*
 * ============================================================
 * DISPLAY HELPERS
 * ============================================================
 */

function line(character = '=', length = 62) {
  return character.repeat(length);
}

function printHeader() {
  console.log('');
  console.log(
    `${color.blue}${line()}${color.reset}`
  );

  console.log(
    `${color.bold}${color.white}` +
      '                 QA SENTINEL TYRA v1.0' +
      `${color.reset}`
  );

  console.log(
    `${color.cyan}` +
      '          Enterprise Quality Intelligence' +
      `${color.reset}`
  );

  console.log(
    `${color.blue}${line()}${color.reset}`
  );

  console.log('');
}

function printStep(number, total, message) {
  console.log(
    `${color.cyan}[${number}/${total}]${color.reset} ` +
      `${color.bold}${message}${color.reset}`
  );
}

function printSuccess(message) {
  console.log(
    `${color.green}✓${color.reset} ${message}`
  );
}

function printWarning(message) {
  console.log(
    `${color.yellow}!${color.reset} ${message}`
  );
}

function printError(message) {
  console.log(
    `${color.red}✗${color.reset} ${message}`
  );
}

function metric(label, value) {
  const width = 28;

  const dots = '.'.repeat(
    Math.max(
      2,
      width - label.length
    )
  );

  return (
    `${color.gray}${label}${dots}${color.reset}` +
    `${color.bold}${value}${color.reset}`
  );
}

function section(title) {
  console.log('');
  console.log(
    `${color.blue}${line('-', 62)}${color.reset}`
  );

  console.log(
    `${color.bold}${color.cyan}` +
      title +
      `${color.reset}`
  );

  console.log(
    `${color.blue}${line('-', 62)}${color.reset}`
  );
}

/*
 * ============================================================
 * COMMAND EXECUTION
 * ============================================================
 */

function runCommand(
  command,
  args = [],
  {
    allowFailure = false,
  } = {}
) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      args,
      {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
      }
    );

    child.on('close', code => {
      if (code === 0) {
        resolve({
          code,
          success: true,
        });

        return;
      }

      if (allowFailure) {
        console.log('');

        printWarning(
          `Test command completed with exit code ${code}.`
        );

        console.log(
          `${color.dim}` +
            'QA Sentinel will continue so the failures can be ' +
            'classified, reported and displayed.' +
            `${color.reset}`
        );

        resolve({
          code,
          success: false,
        });

        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} exited with code ${code}`
        )
      );
    });

    child.on('error', reject);
  });
}

/*
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

async function dashboardIsRunning() {
  try {
    const response = await fetch(
      dashboardUrl,
      {
        signal: AbortSignal.timeout(1000),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

function startDashboard() {
  const child = spawn(
    'npm',
    ['run', 'dashboard'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
      detached: false,
    }
  );

  child.on('error', error => {
    printError(
      `Failed to start dashboard: ${error.message}`
    );
  });

  return child;
}

async function waitForDashboard(
  timeoutMilliseconds = 10000
) {
  const started = Date.now();

  while (
    Date.now() - started <
    timeoutMilliseconds
  ) {
    if (await dashboardIsRunning()) {
      return true;
    }

    await wait(300);
  }

  return false;
}

/*
 * ============================================================
 * BROWSER
 * ============================================================
 */

function openTarget(target) {
  if (process.platform === 'win32') {
    spawn(
      'cmd',
      ['/c', 'start', '', target],
      {
        detached: true,
        stdio: 'ignore',
      }
    ).unref();

    return;
  }

  if (process.platform === 'darwin') {
    spawn(
      'open',
      [target],
      {
        detached: true,
        stdio: 'ignore',
      }
    ).unref();

    return;
  }

  spawn(
    'xdg-open',
    [target],
    {
      detached: true,
      stdio: 'ignore',
    }
  ).unref();
}

/*
 * ============================================================
 * RESULT DATA
 * ============================================================
 */

function loadLatestRun() {
  if (!existsSync(latestRunFile)) {
    return null;
  }

  try {
    const content = readFileSync(
      latestRunFile,
      'utf8'
    );

    return JSON.parse(content);
  } catch (error) {
    printWarning(
      `Could not read latest-run.json: ${error.message}`
    );

    return null;
  }
}

function formatDuration(milliseconds) {
  const value = Number(milliseconds);

  if (!Number.isFinite(value)) {
    return '—';
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${Math.round(value)} ms`;
}

function getReleaseStatus(run) {
  return (
    run?.releaseAssessment?.status ??
    run?.release?.status ??
    'UNKNOWN'
  );
}

function formatReleaseStatus(value) {
  const normalized =
    String(value ?? 'UNKNOWN')
      .replaceAll('-', ' ')
      .replaceAll('_', ' ')
      .toUpperCase();

  return normalized;
}

function getPerformance(run) {
  return (
    run?.performance ??
    run?.performanceStatistics ??
    {}
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

function printSummary(run) {
  if (!run) {
    section('QA RESULT');

    printWarning(
      'No latest-run.json data was available.'
    );

    return;
  }

  const classification =
    run.classificationSummary ?? {};

  const performance =
    getPerformance(run);

  const release =
    run.releaseAssessment ??
    run.release ??
    {};

  /*
   * QUALITY
   */

  section('QUALITY');

  console.log(
    metric(
      'Health',
      `${run.health ?? 0}%`
    )
  );

  console.log(
    metric(
      'Total tests',
      run.totalTests ?? 0
    )
  );

  console.log(
    metric(
      'Passed',
      run.passed ?? 0
    )
  );

  console.log(
    metric(
      'Failed',
      run.failed ?? 0
    )
  );

  console.log(
    metric(
      'Skipped',
      run.skipped ?? 0
    )
  );

  console.log(
    metric(
      'Warnings',
      run.warnings ??
        classification.warnings ??
        0
    )
  );

  /*
   * ISSUES
   */

  section('ISSUE INTELLIGENCE');

  console.log(
    metric(
      'Product bugs',
      classification.productBugs ?? 0
    )
  );

  console.log(
    metric(
      'Content bugs',
      classification.contentBugs ?? 0
    )
  );

  console.log(
    metric(
      'Automation issues',
      classification.automationIssues ?? 0
    )
  );

  console.log(
    metric(
      'Accessibility',
      classification.accessibilityIssues ?? 0
    )
  );

  console.log(
    metric(
      'Performance',
      classification.performanceIssues ?? 0
    )
  );

  console.log(
    metric(
      'Security',
      classification.securityIssues ?? 0
    )
  );

  console.log(
    metric(
      'Needs investigation',
      classification.needsInvestigation ?? 0
    )
  );

  /*
   * PERFORMANCE
   */

  section('PERFORMANCE');

  console.log(
    metric(
      'Average',
      formatDuration(
        performance.averageDuration ??
        run.averageDuration
      )
    )
  );

  console.log(
    metric(
      'Median',
      formatDuration(
        performance.medianDuration ??
        run.medianDuration
      )
    )
  );

  console.log(
    metric(
      'P95',
      formatDuration(
        performance.p95Duration ??
        run.p95Duration
      )
    )
  );

  console.log(
    metric(
      'Wall-clock',
      formatDuration(
        performance.wallClockDuration ??
        run.wallClockDuration
      )
    )
  );

  /*
   * RELEASE
   */

  section('RELEASE READINESS');

  console.log(
    metric(
      'Status',
      formatReleaseStatus(
        getReleaseStatus(run)
      )
    )
  );

  console.log(
    metric(
      'Risk',
      String(
        release.risk ?? 'UNKNOWN'
      ).toUpperCase()
    )
  );

  console.log(
    metric(
      'Confidence',
      `${release.confidence ?? 0}%`
    )
  );

  console.log(
    metric(
      'Blocking issues',
      release.blockingIssues ?? 0
    )
  );

  console.log(
    metric(
      'Non-blocking issues',
      release.nonBlockingIssues ?? 0
    )
  );

  if (release.verdict) {
    console.log('');
    console.log(
      `${color.bold}Verdict${color.reset}`
    );

    console.log(
      release.verdict
    );
  }

  if (release.recommendedAction) {
    console.log('');
    console.log(
      `${color.bold}Recommended action${color.reset}`
    );

    console.log(
      release.recommendedAction
    );
  }
}

/*
 * ============================================================
 * FINAL STATUS
 * ============================================================
 */

function printReady() {
  console.log('');
  console.log(
    `${color.green}${line()}${color.reset}`
  );

  console.log(
    `${color.bold}${color.green}` +
      '             QA SENTINEL TYRA IS READY' +
      `${color.reset}`
  );

  console.log(
    `${color.green}${line()}${color.reset}`
  );

  console.log('');

  console.log(
    `${color.bold}Dashboard${color.reset}`
  );

  console.log(
    `${color.cyan}${dashboardUrl}${color.reset}`
  );

  console.log('');

  console.log(
    `${color.bold}Executive Report${color.reset}`
  );

  console.log(
    `${color.cyan}${executiveReportUrl}${color.reset}`
  );

  console.log('');

  console.log(
    `${color.dim}` +
      'Quality First · Automate Everything · Ship with Confidence' +
      `${color.reset}`
  );

  console.log('');
}

/*
 * ============================================================
 * UTILITIES
 * ============================================================
 */

function wait(milliseconds) {
  return new Promise(resolve =>
    setTimeout(resolve, milliseconds)
  );
}

/*
 * ============================================================
 * MAIN
 * ============================================================
 */

async function main() {
  printHeader();

  try {
    /*
     * STEP 1
     */

    printStep(
      1,
      5,
      'Validating TypeScript'
    );

    await runCommand(
      'npm',
      ['run', 'typecheck']
    );

    printSuccess(
      'TypeScript validation passed.'
    );

    console.log('');

    /*
     * STEP 2
     */

    printStep(
      2,
      5,
      'Running Nation QA tests'
    );

    const testResult =
      await runCommand(
        'npm',
        ['run', 'test:nation'],
        {
          allowFailure: true,
        }
      );

    if (testResult.success) {
      printSuccess(
        'All Playwright tests completed successfully.'
      );
    } else {
      printWarning(
        'Playwright detected test failures.'
      );

      printSuccess(
        'QA Sentinel captured the failures for analysis.'
      );
    }

    /*
     * STEP 3
     */

    console.log('');

    printStep(
      3,
      5,
      'Loading quality intelligence'
    );

    const latestRun =
      loadLatestRun();

    if (latestRun) {
      printSuccess(
        'Latest QA intelligence loaded.'
      );

      printSummary(latestRun);
    } else {
      printWarning(
        'Latest QA result could not be loaded.'
      );
    }

    /*
     * STEP 4
     */

    console.log('');

    printStep(
      4,
      5,
      'Starting QA dashboard'
    );

    const alreadyRunning =
      await dashboardIsRunning();

    if (alreadyRunning) {
      printSuccess(
        'Dashboard server is already running.'
      );
    } else {
      startDashboard();

      const dashboardReady =
        await waitForDashboard();

      if (!dashboardReady) {
        throw new Error(
          'Dashboard server did not become available in time.'
        );
      }

      printSuccess(
        'Dashboard server started.'
      );
    }

    /*
     * STEP 5
     */

    console.log('');

    printStep(
      5,
      5,
      'Opening QA Sentinel'
    );

    openTarget(
      dashboardUrl
    );

    await wait(500);

    openTarget(
      executiveReportUrl
    );

    printSuccess(
      'Dashboard opened.'
    );

    printSuccess(
      'Executive report opened.'
    );

    /*
     * FINISH
     */

    printReady();

    console.log(
      `${color.gray}` +
        'Press Ctrl+C to stop the dashboard server.' +
        `${color.reset}`
    );

    console.log('');
  } catch (error) {
    console.log('');

    console.log(
      `${color.red}${line()}${color.reset}`
    );

    printError(
      'QA Sentinel failed.'
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    console.log(
      `${color.red}${line()}${color.reset}`
    );

    process.exitCode = 1;
  }
}

main();