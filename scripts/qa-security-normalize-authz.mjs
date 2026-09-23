import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();

const args =
  process.argv.slice(2);

const modeIndex =
  args.indexOf('--mode');

const mode =
  modeIndex >= 0
    ? args[modeIndex + 1]
    : 'repository-only';

const source =
  'Tyra Auth/AuthZ';

const engine =
  'authAuthz';

const evidenceFile =
  path.join(
    root,
    'reports',
    'security',
    'authz',
    'authz-security.json'
  );

const postureFiles = [
  path.join(
    root,
    'reports',
    'security',
    'security-posture.json'
  ),
  path.join(
    root,
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

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    )
    .slice(
      0,
      80
    );
}

function severity(value) {
  const normalized =
    String(
      value ?? 'info'
    ).toLowerCase();

  if (
    normalized === 'critical' ||
    normalized === 'high' ||
    normalized === 'medium' ||
    normalized === 'low' ||
    normalized === 'info'
  ) {
    return normalized;
  }

  if (
    normalized === 'warning'
  ) {
    return 'medium';
  }

  return 'info';
}

function stableRuleId(item) {
  if (item?.ruleId) {
    return String(
      item.ruleId
    );
  }

  const title =
    String(
      item?.title ?? ''
    ).toLowerCase();

  if (
    title.includes(
      'session cookie'
    )
  ) {
    return (
      'session-cookie-defensive-flags'
    );
  }

  if (
    title.includes(
      'protected route'
    ) ||
    title.includes(
      'access control'
    ) ||
    title.includes(
      'authorization'
    )
  ) {
    return (
      'protected-route-access-control'
    );
  }

  const fallback =
    slug(
      item?.title ??
      item?.category ??
      'finding'
    );

  return (
    `authz-${fallback || 'finding'}`
  );
}

function fingerprint(item) {
  return crypto
    .createHash('sha256')
    .update(
      [
        item.source ?? '',
        item.category ?? '',
        item.ruleId ?? '',
        item.target ?? '',
        item.title ?? '',
      ].join('|')
    )
    .digest('hex')
    .slice(0, 20);
}

function normalizeFinding(item) {
  const normalized = {
    source,
    engine,

    category:
      item?.category ??
      'authorization',

    severity:
      severity(
        item?.severity
      ),

    title:
      item?.title ??
      'Auth/AuthZ finding',

    ruleId:
      stableRuleId(
        item
      ),

    target:
      item?.target ??
      null,

    description:
      item?.description ??
      null,

    recommendation:
      item?.recommendation ??
      null,

    evidence: {
      evidenceFile:
        'reports/security/authz/authz-security.json',

      raw:
        item?.evidence ??
        null,

      confidence:
        item?.confidence ??
        null,

      rawStatus:
        item?.status ??
        null,
    },
  };

  return {
    ...normalized,

    fingerprint:
      fingerprint(
        normalized
      ),

    occurrences:
      1,
  };
}

let authz = null;

if (
  fs.existsSync(
    evidenceFile
  )
) {
  authz =
    readJson(
      evidenceFile
    );
}

let importAllowed =
  false;

let importReason =
  null;

if (
  mode ===
  'repository-only'
) {
  importReason =
    'Auth/AuthZ network findings are not applicable in repository-only mode.';
}
else if (!authz) {
  importReason =
    'Auth/AuthZ evidence file is unavailable.';
}
else if (
  authz.mode !==
  mode
) {
  importReason =
    `Auth/AuthZ evidence mode mismatch: expected ${mode}, found ${authz.mode}.`;
}
else if (
  authz.runStatus !==
  'complete'
) {
  importReason =
    `Auth/AuthZ run is ${authz.runStatus ?? 'unknown'}; findings were not imported.`;
}
else if (
  authz.authorization
    ?.required === true &&
  authz.authorization
    ?.granted !== true
) {
  importReason =
    'Required Auth/AuthZ authorization was not granted.';
}
else {
  importAllowed =
    true;
}

const rawFindings =
  importAllowed &&
  Array.isArray(
    authz?.findings
  )
    ? authz.findings
    : [];

const grouped =
  new Map();

for (
  const item of
  rawFindings
) {
  const finding =
    normalizeFinding(
      item
    );

  const existing =
    grouped.get(
      finding.fingerprint
    );

  if (existing) {
    existing.occurrences += 1;
  }
  else {
    grouped.set(
      finding.fingerprint,
      finding
    );
  }
}

const normalizedFindings =
  [
    ...grouped.values(),
  ];

let updated =
  0;

for (
  const file of
  postureFiles
) {
  if (
    !fs.existsSync(
      file
    )
  ) {
    continue;
  }

  const posture =
    readJson(
      file
    );

  const current =
    Array.isArray(
      posture.findings
    )
      ? posture.findings
      : [];

  /*
   * Idempotence:
   * remove previous Auth/AuthZ normalized findings
   * before adding the current run's evidence.
   */
  const withoutAuthz =
    current.filter(
      item =>
        item.source !==
          source &&
        item.engine !==
          engine
    );

  posture.findings = [
    ...withoutAuthz,
    ...normalizedFindings,
  ];

  posture.authzFindingIntegration = {
    source,
    engine,
    mode,

    status:
      importAllowed
        ? 'complete'
        : (
            mode ===
              'repository-only'
              ? 'not-applicable'
              : 'not-imported'
          ),

    importedFindings:
      normalizedFindings.length,

    rawFindings:
      rawFindings.length,

    evidenceFile:
      'reports/security/authz/authz-security.json',

    reason:
      importAllowed
        ? null
        : importReason,

    triagePending:
      true,
  };

  writeJson(
    file,
    posture
  );

  updated += 1;
}

console.log('');
console.log(
  'QA SENTINEL TYRA — AUTH/AUTHZ FINDING NORMALIZATION'
);
console.log(
  '==================================================='
);
console.log(
  `Mode: ${mode}`
);
console.log(
  `Posture files updated: ${updated}`
);
console.log(
  `Raw Auth/AuthZ findings: ${rawFindings.length}`
);
console.log(
  `Normalized Auth/AuthZ findings: ${normalizedFindings.length}`
);
console.log(
  `Import status: ${
    importAllowed
      ? 'complete'
      : (
          mode === 'repository-only'
            ? 'not-applicable'
            : 'not-imported'
        )
  }`
);

if (importReason) {
  console.log(
    `Reason: ${importReason}`
  );
}
