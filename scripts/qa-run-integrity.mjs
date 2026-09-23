import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  chromium,
  firefox,
  webkit,
} from '@playwright/test';

const root = process.cwd();

const dataDir =
  path.join(
    root,
    'dashboard',
    'data'
  );

const stateFile =
  path.join(
    dataDir,
    'run-integrity.json'
  );

const latestRunFile =
  path.join(
    dataDir,
    'latest-run.json'
  );

fs.mkdirSync(
  dataDir,
  { recursive: true }
);

const mode =
  process.argv[2] ??
  'preflight';

function now() {
  return new Date().toISOString();
}

function readJson(
  file,
  fallback = null
) {
  try {
    return JSON.parse(
      fs.readFileSync(
        file,
        'utf8'
      )
    );
  } catch {
    return fallback;
  }
}

function writeState(data) {
  fs.writeFileSync(
    stateFile,
    JSON.stringify(
      data,
      null,
      2
    ),
    'utf8'
  );
}

function firstLine(error) {
  return String(
    error?.message ??
    error ??
    ''
  )
    .split(/\r?\n/)
    .find(Boolean) ??
    'Unknown error';
}

function normalizePathname(value) {
  const clean =
    String(value || '/')
      .replace(/\/+$/, '');

  return clean || '/';
}

function checkHarness() {
  const required = [
    'package.json',
    'playwright.config.ts',
    'reporters/qa-dashboard-reporter.ts',
    'scripts/scan-site.mjs',
  ];

  return required.map(
    relative => ({
      name: relative,
      exists:
        fs.existsSync(
          path.join(
            root,
            relative
          )
        ),
    })
  );
}

async function checkBrowser(
  name,
  browserType
) {
  const executable =
    browserType.executablePath();

  const result = {
    name,
    executable,
    executableExists:
      fs.existsSync(executable),
    launch: false,
    smokePage: false,
    status: 'BLOCKED',
    error: null,
  };

  let browser;

  try {
    browser =
      await browserType.launch({
        headless: true,
      });

    result.launch = true;

    const page =
      await browser.newPage();

    await page.goto(
      'data:text/html,<title>QA Sentinel Preflight</title><h1>ready</h1>'
    );

    const title =
      await page.title();

    result.smokePage =
      title ===
      'QA Sentinel Preflight';

    result.status =
      result.launch &&
      result.smokePage
        ? 'READY'
        : 'BLOCKED';
  } catch (error) {
    result.error =
      firstLine(error);
  } finally {
    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }
  }

  return result;
}

async function checkTarget(
  name,
  url
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      15000
    );

  try {
    const response =
      await fetch(
        url,
        {
          method: 'GET',
          redirect: 'follow',
          signal:
            controller.signal,
          headers: {
            'user-agent':
              'QA-Sentinel-Tyra-Preflight/1.0',
          },
        }
      );

    return {
      name,
      url,
      reachable: true,
      statusCode:
        response.status,
      finalUrl:
        response.url,
      status:
        response.status < 500
          ? 'READY'
          : 'BLOCKED',
      error: null,
    };
  } catch (error) {
    return {
      name,
      url,
      reachable: false,
      statusCode: null,
      finalUrl: null,
      status: 'BLOCKED',
      error:
        firstLine(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkAuth(
  browserType,
  {
    name,
    statePath,
    url,
  }
) {
  const absoluteState =
    path.join(
      root,
      statePath
    );

  const base = {
    name,
    statePath,
    target: url,
    available:
      fs.existsSync(
        absoluteState
      ),
    verified: false,
    finalUrl: null,
    status: 'NOT_AVAILABLE',
    error: null,
  };

  if (!base.available) {
    return base;
  }

  const state =
    readJson(
      absoluteState,
      null
    );

  if (
    !state ||
    (
      !Array.isArray(
        state.cookies
      ) &&
      !Array.isArray(
        state.origins
      )
    )
  ) {
    return {
      ...base,
      status: 'INVALID',
      error:
        'Storage state could not be parsed.',
    };
  }

  let browser;

  try {
    browser =
      await browserType.launch({
        headless: true,
      });

    const context =
      await browser.newContext({
        storageState:
          absoluteState,
      });

    const page =
      await context.newPage();

    const response =
      await page.goto(
        url,
        {
          waitUntil:
            'domcontentloaded',
          timeout: 20000,
        }
      );

    const finalUrl =
      page.url();

    base.finalUrl =
      finalUrl;

    const expected =
      new URL(url);

    const actual =
      new URL(finalUrl);

    const signin =
      /\/signin(?:\/|$)/i.test(
        actual.pathname
      );

    const exactProtectedPath =
      actual.origin ===
        expected.origin &&
      normalizePathname(
        actual.pathname
      ) ===
        normalizePathname(
          expected.pathname
        );

    base.verified =
      !signin &&
      exactProtectedPath &&
      (
        !response ||
        response.status() < 400
      );

    base.status =
      base.verified
        ? 'VERIFIED'
        : 'NOT_VERIFIED';

    await context.close();
  } catch (error) {
    base.status =
      'NOT_VERIFIED';

    base.error =
      firstLine(error);
  } finally {
    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }
  }

  return base;
}

function playwrightList() {
  const command =
    process.platform ===
    'win32'
      ? 'npx.cmd'
      : 'npx';

  const result =
    spawnSync(
      command,
      [
        'playwright',
        'test',
        '--list',
        '--reporter=line',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          FORCE_COLOR: '0',
        },
      }
    );

  const output =
    `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

  const projectMatches =
    [
      ...output.matchAll(
        /\[([^\]]+)\]\s+›/g
      ),
    ];

  const projects =
    [
      ...new Set(
        projectMatches.map(
          match =>
            match[1]
        )
      ),
    ].sort();

  const totalMatch =
    output.match(
      /Total:\s+(\d+)\s+tests?/i
    );

  let expectedExecutions =
    totalMatch
      ? Number(totalMatch[1])
      : projectMatches.length;

  if (
    !Number.isFinite(
      expectedExecutions
    )
  ) {
    expectedExecutions = 0;
  }

  return {
    command:
      `${command} playwright test --list --reporter=line`,
    exitCode:
      result.status,
    ok:
      result.status === 0 &&
      expectedExecutions > 0,
    expectedExecutions,
    expectedProjects:
      projects,
    expectedProjectCount:
      projects.length,
    error:
      result.error
        ? firstLine(
            result.error
          )
        : (
            result.status === 0
              ? null
              : (
                  output
                    .split(/\r?\n/)
                    .find(Boolean) ??
                  'Playwright --list failed.'
                )
          ),
  };
}

function browserFromTest(
  test,
  message
) {
  const joined =
    `${test?.project ?? ''} ${test?.browserFamily ?? ''} ${message}`
      .toLowerCase();

  if (
    joined.includes(
      'firefox'
    )
  ) {
    return 'Firefox';
  }

  if (
    joined.includes(
      'webkit'
    )
  ) {
    return 'WebKit';
  }

  if (
    joined.includes(
      'chromium'
    ) ||
    joined.includes(
      'chrome'
    )
  ) {
    return 'Chromium';
  }

  return 'Unknown browser';
}

function classifyInfrastructure(
  test
) {
  const message =
    String(
      test?.error?.message ??
      test?.error ??
      ''
    );

  if (
    /Executable doesn't exist/i.test(
      message
    )
  ) {
    const browser =
      browserFromTest(
        test,
        message
      );

    return {
      id:
        'browser-executable-missing',
      title:
        `${browser} executable missing`,
      browser,
      message:
        firstLine(message),
    };
  }

  if (
    /Host system is missing dependencies/i.test(
      message
    ) ||
    /error while loading shared libraries/i.test(
      message
    ) ||
    /cannot open shared object file/i.test(
      message
    )
  ) {
    const browser =
      browserFromTest(
        test,
        message
      );

    return {
      id:
        'browser-host-dependencies',
      title:
        `${browser} host dependencies missing`,
      browser,
      message:
        firstLine(message),
    };
  }

  if (
    /browserType\.launch:/i.test(
      message
    )
  ) {
    const browser =
      browserFromTest(
        test,
        message
      );

    return {
      id:
        'browser-launch-failure',
      title:
        `${browser} browser launch failure`,
      browser,
      message:
        firstLine(message),
    };
  }

  return null;
}

function logicalFailureKey(
  test
) {
  /*
   * Project/browser/profile MUST NOT be part of the
   * logical Playwright test identity.
   *
   * The same test failing in Chromium, Firefox,
   * WebKit, desktop, tablet and mobile remains
   * one logical failing test.
   */
  const stableTitle =
    String(
      test?.title ??
      test?.fullTitle ??
      ''
    ).trim();

  return [
    test?.site ?? '',
    test?.file ?? '',
    test?.line ?? '',
    stableTitle,
  ].join('|');
}

function groupInfrastructure(
  items
) {
  const groups =
    new Map();

  for (
    const item of items
  ) {
    const key =
      `${item.infrastructure.id}|${item.infrastructure.browser}`;

    const current =
      groups.get(key);

    if (current) {
      current.affectedExecutions +=
        1;

      current.affectedProjects.push(
        item.test.project
      );

      current.affectedTests.push(
        item.test.fullTitle ??
        item.test.title
      );

      continue;
    }

    groups.set(
      key,
      {
        id:
          item.infrastructure.id,
        title:
          item.infrastructure.title,
        browser:
          item.infrastructure.browser,
        message:
          item.infrastructure.message,
        affectedExecutions: 1,
        affectedProjects: [
          item.test.project,
        ],
        affectedTests: [
          item.test.fullTitle ??
          item.test.title,
        ],
      }
    );
  }

  return [
    ...groups.values(),
  ].map(
    group => ({
      ...group,
      affectedProjects:
        [
          ...new Set(
            group.affectedProjects
              .filter(Boolean)
          ),
        ].sort(),
      affectedTests:
        [
          ...new Set(
            group.affectedTests
              .filter(Boolean)
          ),
        ].sort(),
    })
  );
}

async function preflight() {
  console.log(
    '============================================================'
  );

  console.log(
    'QA SENTINEL TYRA — RUN INTEGRITY PREFLIGHT'
  );

  console.log(
    '============================================================'
  );

  const harness =
    checkHarness();

  const browsers = [];

  for (
    const [
      name,
      browserType,
    ] of [
      [
        'Chromium',
        chromium,
      ],
      [
        'Firefox',
        firefox,
      ],
      [
        'WebKit',
        webkit,
      ],
    ]
  ) {
    console.log(
      `Checking ${name}...`
    );

    browsers.push(
      await checkBrowser(
        name,
        browserType
      )
    );
  }

  const targets = [];

  for (
    const [
      name,
      url,
    ] of [
      [
        'Nation',
        'https://nation.dev/',
      ],
      [
        'AI Skills',
        'https://aiskills.nation.dev/',
      ],
    ]
  ) {
    console.log(
      `Checking ${name}...`
    );

    targets.push(
      await checkTarget(
        name,
        url
      )
    );
  }

  const authentication =
    [];

  const chromiumReady =
    browsers.find(
      item =>
        item.name ===
        'Chromium'
    )?.status ===
      'READY';

  if (chromiumReady) {
    authentication.push(
      await checkAuth(
        chromium,
        {
          name:
            'Nation authenticated session',
          statePath:
            'playwright/.auth/nation.json',
          url:
            'https://nation.dev/home',
        }
      )
    );

    authentication.push(
      await checkAuth(
        chromium,
        {
          name:
            'AI Skills authenticated session',
          statePath:
            'playwright/.auth/ai-skills.json',
          url:
            'https://aiskills.nation.dev/my-pathway',
        }
      )
    );
  }

  const scope =
    playwrightList();

  const blockers = [];
  const warnings = [];

  for (
    const item of harness
  ) {
    if (!item.exists) {
      blockers.push(
        `Required harness file missing: ${item.name}`
      );
    }
  }

  for (
    const browser of browsers
  ) {
    if (
      browser.status !==
      'READY'
    ) {
      blockers.push(
        `${browser.name} is not launch-ready: ${browser.error ?? 'smoke check failed'}`
      );
    }
  }

  for (
    const target of targets
  ) {
    if (
      target.status !==
      'READY'
    ) {
      blockers.push(
        `${target.name} target is not reachable: ${target.error ?? target.statusCode ?? 'unknown'}`
      );
    }
  }

  if (!scope.ok) {
    blockers.push(
      `Playwright scope could not be enumerated: ${scope.error ?? 'unknown error'}`
    );
  }

  for (
    const auth of authentication
  ) {
    if (!auth.verified) {
      warnings.push(
        `${auth.name}: ${auth.status}`
      );
    }
  }

  const status =
    blockers.length
      ? 'BLOCKED'
      : warnings.length
        ? 'DEGRADED'
        : 'READY';

  const state = {
    schemaVersion: 1,
    capability:
      'qa-trust-run-integrity',
    milestone:
      'M8.1',
    phase:
      'preflight',
    generatedAt:
      now(),
    status,
    qaEvidenceValid: false,
    releaseAuthority:
      'NOT_VERIFIED',
    blockers,
    warnings,
    checks: {
      harness,
      browsers,
      targets,
      authentication,
      scope,
    },
    execution: null,
    infrastructure: {
      affectedExecutions: 0,
      rootCauseCount: 0,
      rootCauses: [],
    },
  };

  writeState(state);

  console.log('');
  console.log(
    `Preflight status: ${status}`
  );

  for (
    const browser of browsers
  ) {
    console.log(
      `${browser.name}: ${browser.status}`
    );
  }

  for (
    const target of targets
  ) {
    console.log(
      `${target.name}: ${target.status}`
    );
  }

  console.log(
    `Expected projects: ${scope.expectedProjectCount}`
  );

  console.log(
    `Expected executions: ${scope.expectedExecutions}`
  );

  console.log(
    `Integrity file: ${stateFile}`
  );

  process.exit(
    blockers.length
      ? 2
      : 0
  );
}

async function postrun() {
  const preflightState =
    readJson(
      stateFile,
      null
    );

  const run =
    readJson(
      latestRunFile,
      null
    );

  if (!run) {
    const failedState = {
      ...(preflightState ?? {}),
      schemaVersion: 1,
      capability:
        'qa-trust-run-integrity',
      milestone:
        'M8.1',
      phase:
        'postrun',
      generatedAt:
        now(),
      status:
        'INVALID',
      qaEvidenceValid: false,
      releaseAuthority:
        'NOT_VERIFIED',
      blockers: [
        ...(
          preflightState?.blockers ??
          []
        ),
        'latest-run.json is missing.',
      ],
    };

    writeState(
      failedState
    );

    process.exit(2);
  }

  const scope =
    playwrightList();

  const tests =
    Array.isArray(
      run.tests
    )
      ? run.tests
      : [];

  const failureStatuses =
    new Set([
      'failed',
      'timedOut',
      'interrupted',
    ]);

  const failedExecutions =
    tests.filter(
      test =>
        failureStatuses.has(
          test.status
        )
    );

  const infrastructureItems =
    [];

  const productFailures =
    [];

  for (
    const test of failedExecutions
  ) {
    const infrastructure =
      classifyInfrastructure(
        test
      );

    if (infrastructure) {
      infrastructureItems.push({
        test,
        infrastructure,
      });
    } else {
      productFailures.push(
        test
      );
    }
  }

  const infraRootCauses =
    groupInfrastructure(
      infrastructureItems
    );

  const uniqueProductFailureKeys =
    new Set(
      productFailures.map(
        logicalFailureKey
      )
    );

  const observedProjects =
    [
      ...new Set(
        tests
          .map(
            test =>
              test.project
          )
          .filter(Boolean)
      ),
    ].sort();

  const expectedProjects =
    scope.expectedProjects ??
    [];

  const missingProjects =
    expectedProjects.filter(
      project =>
        !observedProjects.includes(
          project
        )
    );

  const expectedExecutions =
    scope.expectedExecutions;

  const actualExecutions =
    tests.length;

  const completeness =
    expectedExecutions > 0
      ? Math.min(
          100,
          Math.round(
            (
              actualExecutions /
              expectedExecutions
            ) *
            100
          )
        )
      : 0;

  const authChecks =
    preflightState?.checks
      ?.authentication ??
    [];

  const authVerified =
    authChecks.length >= 2 &&
    authChecks.every(
      item =>
        item.verified === true
    );

  const blockers = [];
  const warnings = [];

  if (
    infrastructureItems.length
  ) {
    blockers.push(
      `${infrastructureItems.length} test executions were blocked by infrastructure failures.`
    );
  }

  if (
    missingProjects.length
  ) {
    blockers.push(
      `${missingProjects.length} configured project(s) did not produce evidence.`
    );
  }

  if (
    expectedExecutions > 0 &&
    actualExecutions <
      expectedExecutions
  ) {
    blockers.push(
      `Execution scope incomplete: ${actualExecutions}/${expectedExecutions}.`
    );
  }

  if (!authVerified) {
    warnings.push(
      'Authenticated coverage was not fully verified during preflight.'
    );
  }

  let status =
    'VALID';

  if (
    infrastructureItems.length
  ) {
    status =
      'INVALID';
  } else if (
    missingProjects.length ||
    (
      expectedExecutions >
        0 &&
      actualExecutions <
        expectedExecutions
    ) ||
    !authVerified
  ) {
    status =
      'PARTIAL';
  }

  const qaEvidenceValid =
    status ===
    'VALID';

  const state = {
    schemaVersion: 1,
    capability:
      'qa-trust-run-integrity',
    milestone:
      'M8.1',
    phase:
      'postrun',
    generatedAt:
      now(),
    status,
    qaEvidenceValid,
    evidenceAuthority:
      qaEvidenceValid
        ? 'VERIFIED'
        : 'NOT_VERIFIED',

    /*
     * Run Integrity verifies whether QA evidence can
     * be trusted. It does NOT independently approve
     * a release.
     *
     * Canonical Unified Decision remains the release
     * authority.
     */
    releaseAuthority:
      'NOT_VERIFIED',

    releaseAuthorityReason:
      qaEvidenceValid
        ? 'Run integrity is verified; canonical Unified Decision must determine release readiness.'
        : 'Run integrity is not valid, therefore release readiness cannot be verified.',

    blockers,
    warnings,
    checks:
      preflightState?.checks ??
      {},
    execution: {
      expectedExecutions,
      actualExecutions,
      completenessPercent:
        completeness,
      expectedProjects,
      observedProjects,
      expectedProjectCount:
        expectedProjects.length,
      observedProjectCount:
        observedProjects.length,
      missingProjects,
      rawFailedExecutions:
        failedExecutions.length,
      productFailureExecutions:
        productFailures.length,
      uniqueProductFailingTests:
        uniqueProductFailureKeys.size,
    },
    infrastructure: {
      affectedExecutions:
        infrastructureItems.length,
      rootCauseCount:
        infraRootCauses.length,
      rootCauses:
        infraRootCauses,
    },
  };

  writeState(state);

  console.log('');
  console.log(
    '============================================================'
  );

  console.log(
    'QA SENTINEL TYRA — RUN INTEGRITY RESULT'
  );

  console.log(
    '============================================================'
  );

  console.log(
    `Run integrity: ${status}`
  );

  console.log(
    `Projects: ${observedProjects.length}/${expectedProjects.length}`
  );

  console.log(
    `Executions: ${actualExecutions}/${expectedExecutions || '?'}`
  );

  console.log(
    `Completeness: ${completeness}%`
  );

  console.log(
    `Raw failed executions: ${failedExecutions.length}`
  );

  console.log(
    `Product/test failures: ${productFailures.length}`
  );

  console.log(
    `Unique product failing tests: ${uniqueProductFailureKeys.size}`
  );

  console.log(
    `Infrastructure affected executions: ${infrastructureItems.length}`
  );

  console.log(
    `Infrastructure root causes: ${infraRootCauses.length}`
  );

  console.log(
    `Evidence authority: ${state.evidenceAuthority}`
  );

  console.log(
    `Release authority: ${state.releaseAuthority}`
  );

  console.log(
    `Integrity file: ${stateFile}`
  );

  process.exit(0);
}

function staleRun() {
  const current =
    readJson(
      stateFile,
      {}
    );

  const state = {
    ...current,
    schemaVersion: 1,
    capability:
      'qa-trust-run-integrity',
    milestone:
      'M8.1',
    phase:
      'execution',
    generatedAt:
      now(),
    status:
      'INVALID',
    qaEvidenceValid: false,
    releaseAuthority:
      'NOT_VERIFIED',
    blockers: [
      ...(
        current.blockers ??
        []
      ),
      'Full QA did not produce a new latest-run.json.',
    ],
  };

  writeState(state);

  console.error(
    '[Run Integrity] INVALID — no fresh latest-run.json was produced.'
  );

  process.exit(2);
}

if (
  mode ===
  'preflight'
) {
  await preflight();
} else if (
  mode ===
  'postrun'
) {
  await postrun();
} else if (
  mode ===
  'stale-run'
) {
  staleRun();
} else {
  console.error(
    `Unknown mode: ${mode}`
  );

  process.exit(2);
}
