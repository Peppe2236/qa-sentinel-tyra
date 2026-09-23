import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

const reportDir = path.join(
  root,
  'reports',
  'security'
);

const dataDir = path.join(
  root,
  'dashboard',
  'data'
);

fs.mkdirSync(reportDir, {
  recursive: true,
});

fs.mkdirSync(dataDir, {
  recursive: true,
});

const args = process.argv.slice(2);

const modeIndex =
  args.indexOf('--mode');

const mode =
  modeIndex >= 0
    ? args[modeIndex + 1]
    : 'production-safe';

const allowedModes =
  new Set([
    'production-safe',
    'staging-active',
    'manual-validation',
    'repository-only',
  ]);

if (!allowedModes.has(mode)) {
  console.error(
    `[Security] Unsupported mode: ${mode}`
  );

  process.exit(2);
}

const generatedAt =
  new Date().toISOString();

const rawDir =
  path.join(
    reportDir,
    'raw'
  );

fs.mkdirSync(
  rawDir,
  {
    recursive: true,
  }
);

const findings = [];
const engines = {};

function commandExists(command) {
  const checker =
    process.platform === 'win32'
      ? 'where.exe'
      : 'which';

  const result =
    spawnSync(
      checker,
      [command],
      {
        cwd: root,
        stdio: 'ignore',
        windowsHide: true,
      }
    );

  return result.status === 0;
}

function run(
  command,
  commandArgs,
  options = {}
) {
  return spawnSync(
    command,
    commandArgs,
    {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer:
        25 * 1024 * 1024,
      timeout:
        options.timeout ??
        20 * 60 * 1000,
      env: {
        ...process.env,
        ...(options.env ?? {}),
      },
    }
  );
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

function writeRaw(
  name,
  value
) {
  const file =
    path.join(
      rawDir,
      name
    );

  fs.writeFileSync(
    file,
    typeof value === 'string'
      ? value
      : JSON.stringify(
          value,
          null,
          2
        ),
    'utf8'
  );

  return file;
}

function severity(value) {
  const normalized =
    String(value ?? '')
      .toLowerCase();

  if (
    normalized === 'critical'
  ) {
    return 'critical';
  }

  if (
    normalized === 'high' ||
    normalized === 'error'
  ) {
    return 'high';
  }

  if (
    normalized === 'medium' ||
    normalized === 'warning'
  ) {
    return 'medium';
  }

  if (
    normalized === 'low'
  ) {
    return 'low';
  }

  return 'info';
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

function addFinding(item) {
  findings.push({
    source:
      item.source ??
      'unknown',

    category:
      item.category ??
      'security',

    severity:
      severity(
        item.severity
      ),

    title:
      item.title ??
      'Security finding',

    ruleId:
      item.ruleId ??
      null,

    target:
      item.target ??
      null,

    description:
      item.description ??
      null,

    recommendation:
      item.recommendation ??
      null,

    evidence:
      item.evidence ??
      null,

    fingerprint:
      fingerprint(item),
  });
}


/*
 * Existing QA Sentinel Tyra pentest.
 *
 * All existing production/staging authorization,
 * allowlisting and active-scan safety remains inside
 * qa-pentest.mjs.
 */
function runTyraPentest() {
  if (
    mode ===
    'repository-only'
  ) {
    engines.tyraPentest = {
      status: 'not-applicable',
    };

    return;
  }

  console.log(
    `[Security] Tyra pentest: ${mode}`
  );

  const result =
    run(
      process.execPath,
      [
        'scripts/qa-pentest.mjs',
        '--mode',
        mode,
      ],
      {
        timeout:
          45 * 60 * 1000,
      }
    );

  process.stdout.write(
    result.stdout ?? ''
  );

  process.stderr.write(
    result.stderr ?? ''
  );

  const reportFile =
    path.join(
      root,
      'reports',
      'pentest',
      'pentest-report.json'
    );

  const report =
    readJson(
      reportFile,
      null
    );

  engines.tyraPentest = {
    status:
      report
        ? (
            report.executionStatus ??
            'complete'
          )
        : (
            result.status === 0
              ? 'complete'
              : 'error'
          ),

    exitCode:
      result.status,

    report:
      reportFile,
  };

  if (
    Array.isArray(
      report?.findings
    )
  ) {
    for (
      const item of
      report.findings
    ) {
      addFinding({
        source:
          item.source ??
          'QA Sentinel Pentest',

        category:
          item.category ??
          'dynamic-security',

        severity:
          item.severity,

        title:
          item.title,

        ruleId:
          item.ruleId ??
          item.id,

        target:
          item.target,

        description:
          item.evidence ??
          item.description,

        recommendation:
          item.recommendation,

        evidence:
          item,
      });
    }
  }
}


function runNpmAudit() {
  console.log(
    '[Security] npm audit'
  );

  const result =
    run(
      'npm',
      [
        'audit',
        '--json',
      ]
    );

  const raw =
    result.stdout ||
    result.stderr ||
    '{}';

  writeRaw(
    'npm-audit.json',
    raw
  );

  let data;

  try {
    data =
      JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!data) {
    engines.npmAudit = {
      status: 'error',
      exitCode:
        result.status,
    };

    return;
  }

  engines.npmAudit = {
    status: 'complete',
    exitCode:
      result.status,
  };

  const vulnerabilities =
    data.vulnerabilities ??
    {};

  for (
    const [
      packageName,
      item,
    ] of Object.entries(
      vulnerabilities
    )
  ) {
    const via =
      Array.isArray(item.via)
        ? item.via
        : [];

    const advisory =
      via.find(
        entry =>
          typeof entry ===
          'object'
      );

    addFinding({
      source:
        'npm audit',

      category:
        'dependency',

      severity:
        item.severity,

      title:
        `Dependency vulnerability: ${packageName}`,

      ruleId:
        advisory?.source
          ? `npm-${advisory.source}`
          : `npm-${packageName}`,

      target:
        packageName,

      description:
        advisory?.title ??
        `npm reported ${item.severity ?? 'unknown'} vulnerability evidence.`,

      recommendation:
        item.fixAvailable
          ? 'Review npm audit remediation and update the affected dependency.'
          : 'Review the advisory and determine an appropriate dependency remediation.',

      evidence: {
        range:
          item.range,
        nodes:
          item.nodes,
        fixAvailable:
          item.fixAvailable,
      },
    });
  }
}


function runGitleaks() {
  if (
    !commandExists(
      'gitleaks'
    )
  ) {
    engines.gitleaks = {
      status:
        'not-installed',
    };

    return;
  }

  console.log(
    '[Security] Gitleaks'
  );

  const output =
    path.join(
      rawDir,
      'gitleaks.json'
    );

  const result =
    run(
      'gitleaks',
      [
        'git',
        '--report-format',
        'json',
        '--report-path',
        output,
        '--redact',
        '--no-banner',
        '.',
      ]
    );

  const data =
    readJson(
      output,
      []
    );

  engines.gitleaks = {
    status:
      Array.isArray(data)
        ? 'complete'
        : 'error',

    exitCode:
      result.status,
  };

  if (
    Array.isArray(data)
  ) {
    for (
      const item of data
    ) {
      addFinding({
        source:
          'Gitleaks',

        category:
          'secret',

        severity:
          'high',

        title:
          item.Description ??
          'Potential secret detected',

        ruleId:
          item.RuleID,

        target:
          item.File,

        description:
          `Potential credential or secret detected at ${item.File ?? 'unknown file'}:${item.StartLine ?? '?'}. Secret value is intentionally not included.`,

        recommendation:
          'Verify whether the finding is a real secret. Revoke exposed credentials and remove them from source/history where appropriate.',

        evidence: {
          file:
            item.File,

          line:
            item.StartLine,

          rule:
            item.RuleID,
        },
      });
    }
  }
}


function runSemgrep() {
  if (
    !commandExists(
      'semgrep'
    )
  ) {
    engines.semgrep = {
      status:
        'not-installed',
    };

    return;
  }

  console.log(
    '[Security] Semgrep'
  );

  const output =
    path.join(
      rawDir,
      'semgrep.json'
    );

  const result =
    run(
      'semgrep',
      [
        'scan',

        /*
         * Explicit registry config keeps Semgrep deterministic
         * and allows metrics to remain disabled.
         */
        '--config',
        'p/security-audit',

        '--json',
        '--metrics',
        'off',

        '--exclude',
        'node_modules',

        '--exclude',
        '.git',

        '--exclude',
        '.workbench-backup',

        '--exclude',
        'reports',

        '--exclude',
        'playwright-report',

        '--exclude',
        'test-results',

        '--exclude',
        'dist',

        '--exclude',
        'build',

        '--output',
        output,
        '.',
      ],
      {
        timeout:
          30 * 60 * 1000,
      }
    );

  const data =
    readJson(
      output,
      null
    );

  engines.semgrep = {
    status:
      data
        ? 'complete'
        : 'error',

    exitCode:
      result.status,
  };

  for (
    const item of
    data?.results ?? []
  ) {
    addFinding({
      source:
        'Semgrep',

      category:
        'sast',

      severity:
        item.extra?.severity,

      title:
        item.extra?.message ??
        item.check_id,

      ruleId:
        item.check_id,

      target:
        item.path,

      description:
        item.extra?.message,

      recommendation:
        'Review the identified source-code pattern and remediate it if the data/control flow confirms the finding.',

      evidence: {
        file:
          item.path,

        start:
          item.start,

        end:
          item.end,
      },
    });
  }
}


function runTrivy() {
  if (
    !commandExists(
      'trivy'
    )
  ) {
    engines.trivy = {
      status:
        'not-installed',
    };

    return;
  }

  console.log(
    '[Security] Trivy filesystem'
  );

  const output =
    path.join(
      rawDir,
      'trivy.json'
    );

  const result =
    run(
      'trivy',
      [
        'fs',
        '--quiet',
        '--format',
        'json',
        '--output',
        output,
        '--scanners',
        'vuln,misconfig,secret',
        '.',
      ],
      {
        timeout:
          30 * 60 * 1000,
      }
    );

  const data =
    readJson(
      output,
      null
    );

  engines.trivy = {
    status:
      data
        ? 'complete'
        : 'error',

    exitCode:
      result.status,
  };

  for (
    const resultItem of
    data?.Results ?? []
  ) {
    for (
      const vuln of
      resultItem.Vulnerabilities ??
      []
    ) {
      addFinding({
        source:
          'Trivy',

        category:
          'dependency',

        severity:
          vuln.Severity,

        title:
          vuln.Title ??
          `${vuln.PkgName ?? 'Package'} ${vuln.VulnerabilityID ?? ''}`,

        ruleId:
          vuln.VulnerabilityID,

        target:
          resultItem.Target,

        description:
          vuln.Description,

        recommendation:
          vuln.FixedVersion
            ? `Upgrade to a fixed version such as ${vuln.FixedVersion}.`
            : 'Review the vulnerability and available remediation.',

        evidence: {
          package:
            vuln.PkgName,

          installedVersion:
            vuln.InstalledVersion,

          fixedVersion:
            vuln.FixedVersion,
        },
      });
    }

    for (
      const misconfig of
      resultItem.Misconfigurations ??
      []
    ) {
      addFinding({
        source:
          'Trivy',

        category:
          'configuration',

        severity:
          misconfig.Severity,

        title:
          misconfig.Title ??
          misconfig.ID,

        ruleId:
          misconfig.ID,

        target:
          resultItem.Target,

        description:
          misconfig.Description,

        recommendation:
          misconfig.Resolution ??
          'Review and correct the configuration.',

        evidence: {
          target:
            resultItem.Target,

          namespace:
            misconfig.Namespace,
        },
      });
    }

    for (
      const secret of
      resultItem.Secrets ??
      []
    ) {
      addFinding({
        source:
          'Trivy',

        category:
          'secret',

        severity:
          secret.Severity ??
          'high',

        title:
          secret.Title ??
          secret.RuleID ??
          'Potential secret detected',

        ruleId:
          secret.RuleID,

        target:
          resultItem.Target,

        description:
          'Potential secret detected. The secret value is intentionally omitted from the Tyra normalized report.',

        recommendation:
          'Verify the finding and rotate/revoke the credential if it is real.',

        evidence: {
          target:
            resultItem.Target,

          startLine:
            secret.StartLine,

          endLine:
            secret.EndLine,
        },
      });
    }
  }
}


runTyraPentest();
runNpmAudit();
runGitleaks();
runSemgrep();
runTrivy();


/*
 * Deduplicate observations without hiding repetition.
 */
const grouped =
  new Map();

for (
  const finding of findings
) {
  const current =
    grouped.get(
      finding.fingerprint
    );

  if (current) {
    current.occurrences += 1;
    continue;
  }

  grouped.set(
    finding.fingerprint,
    {
      ...finding,
      occurrences: 1,
    }
  );
}

const uniqueFindings =
  [
    ...grouped.values(),
  ];

const severityOrder = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

uniqueFindings.sort(
  (a, b) =>
    (
      severityOrder[
        b.severity
      ] ?? 0
    ) -
    (
      severityOrder[
        a.severity
      ] ?? 0
    )
);

const counts = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
};

for (
  const finding of
  uniqueFindings
) {
  counts[
    finding.severity
  ] += 1;
}

const engineValues =
  Object.values(
    engines
  );

const unavailable =
  engineValues.filter(
    item =>
      item.status ===
      'not-installed'
  ).length;

const errors =
  engineValues.filter(
    item =>
      item.status ===
      'error'
  ).length;

const report = {
  schemaVersion: 1,
  capability:
    'security-pentest-intelligence',
  milestone:
    'M8.2',
  generatedAt,
  mode,

  postureStatus:
    errors > 0
      ? 'partial'
      : unavailable > 0
        ? 'degraded'
        : 'complete',

  coverage: {
    engines,
    totalEngines:
      engineValues.length,
    unavailableEngines:
      unavailable,
    errorEngines:
      errors,
  },

  summary: {
    totalObservations:
      findings.length,

    uniqueFindings:
      uniqueFindings.length,

    repeatedObservations:
      Math.max(
        0,
        findings.length -
        uniqueFindings.length
      ),

    ...counts,
  },

  findings:
    uniqueFindings,

  note:
    'No automated scanner can prove the absence of vulnerabilities. Coverage status shows what was and was not actually evaluated.',
};

const jsonFile =
  path.join(
    reportDir,
    'security-posture.json'
  );

const dataFile =
  path.join(
    dataDir,
    'security-posture.json'
  );

fs.writeFileSync(
  jsonFile,
  JSON.stringify(
    report,
    null,
    2
  ),
  'utf8'
);

fs.writeFileSync(
  dataFile,
  JSON.stringify(
    report,
    null,
    2
  ),
  'utf8'
);

const markdown = `# QA Sentinel Tyra — Security Posture

Generated: ${generatedAt}

Mode: **${mode}**

Security evidence status: **${report.postureStatus.toUpperCase()}**

## Coverage

${Object.entries(engines)
  .map(
    ([name, value]) =>
      `- **${name}:** ${value.status}`
  )
  .join('\n')}

## Summary

- Observations: ${report.summary.totalObservations}
- Unique findings: ${report.summary.uniqueFindings}
- Repeated observations: ${report.summary.repeatedObservations}
- Critical: ${counts.critical}
- High: ${counts.high}
- Medium: ${counts.medium}
- Low: ${counts.low}
- Info: ${counts.info}

## Findings

${
  uniqueFindings.length
    ? uniqueFindings
        .map(
          item =>
            `### ${item.severity.toUpperCase()} — ${item.title}

- Source: ${item.source}
- Category: ${item.category}
- Target: ${item.target ?? 'n/a'}
- Rule: ${item.ruleId ?? 'n/a'}
- Occurrences: ${item.occurrences}

${item.description ?? ''}

**Recommendation:** ${item.recommendation ?? 'Review the retained evidence.'}
`
        )
        .join('\n')
    : 'No findings were reported by the security engines that completed.'
}

> ${report.note}
`;

fs.writeFileSync(
  path.join(
    reportDir,
    'security-posture.md'
  ),
  markdown,
  'utf8'
);

console.log('');
console.log(
  '============================================================'
);

console.log(
  'QA SENTINEL TYRA — SECURITY POSTURE'
);

console.log(
  '============================================================'
);

console.log(
  `Mode: ${mode}`
);

console.log(
  `Evidence status: ${report.postureStatus.toUpperCase()}`
);

console.log(
  `Observations: ${report.summary.totalObservations}`
);

console.log(
  `Unique findings: ${report.summary.uniqueFindings}`
);

console.log(
  `Critical: ${counts.critical}`
);

console.log(
  `High: ${counts.high}`
);

console.log(
  `Medium: ${counts.medium}`
);

console.log(
  `Low: ${counts.low}`
);

console.log('');
console.log('Engines:');

for (
  const [
    name,
    value,
  ] of Object.entries(
    engines
  )
) {
  console.log(
    `  ${name}: ${value.status}`
  );
}

console.log('');
console.log(
  `Report: ${jsonFile}`
);

console.log(
  `Dashboard: ${dataFile}`
);
