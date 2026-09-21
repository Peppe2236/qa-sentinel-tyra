import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const siteId = process.argv[2];

const configs = {
  nation: {
    id: 'nation',
    label: 'Nation',
    targetUrl: 'https://nation.dev/home',
    authFile: 'playwright/.auth/nation.json',
    profileName: 'qa-sentinel-nation-auth',
    port: 9223,
    scanScript: 'scan:nation:auth',
    coverageFile:
      'dashboard/data/discovery-coverage-nation.json',
  },

  'ai-skills': {
    id: 'ai-skills',
    label: 'AI Skills',
    targetUrl:
      'https://aiskills.nation.dev/my-pathway',
    authFile:
      'playwright/.auth/ai-skills.json',
    profileName:
      'qa-sentinel-ai-skills-auth',
    port: 9222,
    scanScript:
      'scan:skills:auth',
    coverageFile:
      'dashboard/data/discovery-coverage-ai-skills.json',
  },
};

const config = configs[siteId];

if (!config) {
  console.error(
    'Usage: node scripts/auth-refresh.mjs ' +
    '<nation|ai-skills>'
  );
  process.exit(1);
}

const statusFile = path.resolve(
  root,
  'dashboard/data',
  `auth-manager-${siteId}.json`
);

const authFile = path.resolve(
  root,
  config.authFile
);

function writeStatus(
  state,
  message,
  extra = {}
) {
  fs.mkdirSync(
    path.dirname(statusFile),
    { recursive: true }
  );

  fs.writeFileSync(
    statusFile,
    JSON.stringify(
      {
        schemaVersion: 1,
        siteId,
        siteLabel: config.label,
        state,
        message,
        updatedAt:
          new Date().toISOString(),
        ...extra,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
}

function run(
  command,
  args,
  options = {}
) {
  const result = spawnSync(
    command,
    args,
    {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
      ...options,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed ` +
      `with exit code ${result.status}`
    );
  }
}

function capture(
  command,
  args
) {
  const result = spawnSync(
    command,
    args,
    {
      cwd: root,
      encoding: 'utf8',
    }
  );

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      result.stderr ||
      `${command} failed`
    );
  }

  return result.stdout.trim();
}

async function existingSessionWorks() {
  if (!fs.existsSync(authFile)) {
    return false;
  }

  let browser;

  try {
    browser =
      await chromium.launch({
        headless: true,
      });

    const context =
      await browser.newContext({
        storageState:
          config.authFile,
      });

    const page =
      await context.newPage();

    await page.goto(
      config.targetUrl,
      {
        waitUntil:
          'domcontentloaded',
        timeout: 30000,
      }
    );

    const actual =
      new URL(page.url());

    const expected =
      new URL(config.targetUrl);

    await context.close();

    return (
      actual.origin ===
        expected.origin &&
      actual.pathname ===
        expected.pathname
    );
  } catch {
    return false;
  } finally {
    await browser
      ?.close()
      .catch(() => {});
  }
}

async function main() {
  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    ` QA SENTINEL TYRA — ${config.label} AUTH`
  );
  console.log(
    '=============================================='
  );

  writeStatus(
    'checking',
    'Checking existing authenticated session.'
  );

  const alreadyValid =
    await existingSessionWorks();

  if (alreadyValid) {
    console.log(
      'Existing session is valid.'
    );

    writeStatus(
      'verifying',
      'Existing session is valid. Refreshing authenticated discovery.'
    );
  } else {
    writeStatus(
      'waiting-login',
      'Opening secure Chrome. Sign in normally; Tyra will continue automatically.'
    );

    console.log('');
    console.log(
      'Opening real Google Chrome...'
    );
    console.log(
      'Sign in normally if requested.'
    );
    console.log(
      'Tyra will continue automatically.'
    );
    console.log('');

    const psScript =
      path.resolve(
        root,
        'scripts/auth-capture-windows.ps1'
      );

    const windowsScript =
      capture(
        'wslpath',
        ['-w', psScript]
      );

    const windowsOutput =
      capture(
        'wslpath',
        ['-w', authFile]
      );

    run(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        windowsScript,
        '-SiteLabel',
        config.label,
        '-TargetUrl',
        config.targetUrl,
        '-OutputPath',
        windowsOutput,
        '-Port',
        String(config.port),
        '-ProfileName',
        config.profileName,
        '-TimeoutSeconds',
        '600',
      ]
    );

    writeStatus(
      'verifying',
      'Session captured. Running authenticated discovery.'
    );
  }

  console.log('');
  console.log(
    'Running authenticated discovery...'
  );

  run(
    'npm',
    [
      'run',
      config.scanScript,
    ]
  );

  console.log('');
  console.log(
    'Updating Discovery Coverage...'
  );

  run(
    'npm',
    [
      'run',
      'scan:coverage',
    ]
  );

  const coveragePath =
    path.resolve(
      root,
      config.coverageFile
    );

  if (!fs.existsSync(coveragePath)) {
    throw new Error(
      `Coverage file was not created: ` +
      config.coverageFile
    );
  }

  const coverage =
    JSON.parse(
      fs.readFileSync(
        coveragePath,
        'utf8'
      )
    );

  if (
    coverage.authenticatedVerified !==
    true
  ) {
    throw new Error(
      `${config.label} session was captured ` +
      'but authenticated verification did not pass.'
    );
  }

  writeStatus(
    'complete',
    'Authenticated session verified.',
    {
      authenticatedVerified:
        true,
      coverageGeneratedAt:
        coverage.generatedAt ??
        null,
    }
  );

  console.log('');
  console.log(
    `${config.label}: AUTHENTICATED VERIFIED`
  );
  console.log(
    '=============================================='
  );
}

main().catch(error => {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  writeStatus(
    'error',
    message,
    {
      authenticatedVerified:
        false,
    }
  );

  console.error('');
  console.error(
    'AUTH REFRESH FAILED'
  );
  console.error(message);

  process.exit(1);
});
