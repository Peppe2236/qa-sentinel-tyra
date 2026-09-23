import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const args =
  process.argv.slice(2);

const modeIndex =
  args.indexOf('--mode');

const mode =
  modeIndex >= 0
    ? args[modeIndex + 1]
    : 'repository-only';

const AUTHZ_FILE =
  path.join(
    ROOT,
    'reports',
    'security',
    'authz',
    'authz-security.json'
  );

const POSTURE_FILES = [
  path.join(
    ROOT,
    'reports',
    'security',
    'security-posture.json'
  ),
  path.join(
    ROOT,
    'dashboard',
    'data',
    'security-posture.json'
  ),
];

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(
      file,
      'utf8'
    )
  );
}

function writeJson(
  file,
  value
) {
  fs.mkdirSync(
    path.dirname(file),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    file,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    'utf8'
  );
}

function authzEngine(
  authz
) {
  if (
    mode ===
    'repository-only'
  ) {
    return {
      status:
        'not-applicable',

      mode,

      coverageStatus:
        'not-applicable',

      reason:
        'Auth/AuthZ network/session checks are not applicable in repository-only mode.',
    };
  }

  if (!authz) {
    return {
      status:
        'unavailable',

      mode,

      coverageStatus:
        'not-run',

      reason:
        'Auth/AuthZ evidence file was not available.',
    };
  }

  if (
    authz.mode !==
    'production-safe'
  ) {
    return {
      status:
        'unavailable',

      mode,

      coverageStatus:
        'not-run',

      reason:
        `Expected production-safe Auth/AuthZ evidence but found ${authz.mode}.`,
    };
  }

  let status =
    'error';

  if (
    authz.runStatus ===
    'complete'
  ) {
    status =
      'complete';
  }
  else if (
    authz.runStatus ===
      'blocked' ||
    authz.runStatus ===
      'not-run'
  ) {
    status =
      'unavailable';
  }

  return {
    status,

    mode:
      authz.mode,

    coverageStatus:
      authz.coverageStatus,

    authorizationGranted:
      Boolean(
        authz.authorization
          ?.granted
      ),

    sitesChecked:
      authz.summary
        ?.sitesChecked ??
      0,

    sitesConfigured:
      authz.summary
        ?.sitesConfigured ??
      0,

    routeChecks:
      authz.summary
        ?.routeChecks ??
      0,

    openFindings:
      authz.summary
        ?.openFindings ??
      0,

    high:
      authz.summary
        ?.high ??
      0,

    medium:
      authz.summary
        ?.medium ??
      0,

    notVerified:
      authz.notVerified ??
      [],
  };
}

function recalculateCoverage(
  posture
) {
  posture.coverage ||=
    {};

  posture.coverage.engines ||=
    {};

  const engines =
    Object.values(
      posture.coverage
        .engines
    );

  const total =
    engines.length;

  const notApplicable =
    engines.filter(
      engine =>
        engine.status ===
        'not-applicable'
    ).length;

  const applicable =
    total -
    notApplicable;

  const complete =
    engines.filter(
      engine =>
        engine.status ===
        'complete'
    ).length;

  const unavailable =
    engines.filter(
      engine =>
        engine.status ===
        'unavailable'
    ).length;

  const errors =
    engines.filter(
      engine =>
        engine.status ===
        'error'
    ).length;

  posture.coverage
    .totalEngines =
    total;

  posture.coverage
    .notApplicableEngines =
    notApplicable;

  posture.coverage
    .applicableEngines =
    applicable;

  posture.coverage
    .completeEngines =
    complete;

  posture.coverage
    .unavailableEngines =
    unavailable;

  posture.coverage
    .errorEngines =
    errors;

  posture.coverage
    .coveragePercent =
    applicable > 0
      ? Math.round(
          (
            complete /
            applicable
          ) *
          100
        )
      : 0;

  if (errors > 0) {
    posture.postureStatus =
      'partial';
  }
  else if (
    unavailable > 0
  ) {
    posture.postureStatus =
      'degraded';
  }
  else if (
    complete ===
    applicable
  ) {
    posture.postureStatus =
      'complete';
  }
  else {
    posture.postureStatus =
      'partial';
  }
}

const authz =
  fs.existsSync(
    AUTHZ_FILE
  )
    ? readJson(
        AUTHZ_FILE
      )
    : null;

let updated =
  0;

for (
  const file
  of POSTURE_FILES
) {
  if (
    !fs.existsSync(file)
  ) {
    continue;
  }

  const posture =
    readJson(file);

  posture.coverage ||=
    {};

  posture.coverage.engines ||=
    {};

  posture.coverage
    .engines
    .authAuthz =
    authzEngine(
      authz
    );

  posture.authzSecurity = {
    source:
      'Tyra Auth/AuthZ',

    mode,

    evidenceFile:
      'reports/security/authz/authz-security.json',

    runStatus:
      mode ===
        'repository-only'
        ? 'not-applicable'
        : authz?.runStatus ??
          'not-run',

    coverageStatus:
      mode ===
        'repository-only'
        ? 'not-applicable'
        : authz?.coverageStatus ??
          'not-run',

    routeChecks:
      authz?.summary
        ?.routeChecks ??
      0,

    openFindings:
      authz?.summary
        ?.openFindings ??
      0,

    notVerified:
      authz?.notVerified ??
      [
        'cross-user-authorization',
        'role-authorization',
        'object-ownership-idor',
        'server-api-authorization',
        'server-side-logout-invalidation',
      ],

    note:
      'Engine execution coverage and Auth/AuthZ verification coverage are separate. A completed engine does not imply that all authorization dimensions are verified.',
  };

  posture.authzMergedAt =
    new Date()
      .toISOString();

  recalculateCoverage(
    posture
  );

  writeJson(
    file,
    posture
  );

  updated += 1;
}

if (
  updated === 0
) {
  throw new Error(
    'No Security Posture JSON file was found. Run the security orchestrator and triage first.'
  );
}

console.log('');
console.log(
  'QA SENTINEL TYRA — AUTH/AUTHZ POSTURE MERGE'
);
console.log(
  '============================================'
);
console.log(
  `Mode: ${mode}`
);
console.log(
  `Posture files updated: ${updated}`
);

if (authz) {
  console.log(
    `Auth/AuthZ run: ${
      mode === 'repository-only'
        ? 'not-applicable'
        : authz.runStatus
    }`
  );

  console.log(
    `Auth/AuthZ verification coverage: ${
      mode === 'repository-only'
        ? 'not-applicable'
        : authz.coverageStatus
    }`
  );

  console.log(
    `Route checks: ${authz.summary?.routeChecks ?? 0}`
  );

  console.log(
    `Open Auth/AuthZ findings: ${authz.summary?.openFindings ?? 0}`
  );
}
