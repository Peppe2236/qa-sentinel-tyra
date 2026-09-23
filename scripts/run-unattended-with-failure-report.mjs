import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root =
  process.cwd();

const latestRunFile =
  path.join(
    root,
    'dashboard',
    'data',
    'latest-run.json'
  );

const integrityFile =
  path.join(
    root,
    'dashboard',
    'data',
    'run-integrity.json'
  );

const historyFile =
  path.join(
    root,
    'dashboard',
    'data',
    'history.json'
  );

const reportsDir =
  path.join(
    root,
    'reports'
  );

function runNode(
  script,
  args = []
) {
  return spawnSync(
    process.execPath,
    [
      script,
      ...args,
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env:
        process.env,
    }
  );
}

function runNpm(
  args,
  extraEnv = {}
) {
  return spawnSync(
    'npm',
    args,
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv,
      },
      shell:
        process.platform ===
        'win32',
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

function writeJson(
  file,
  value
) {
  fs.writeFileSync(
    file,
    JSON.stringify(
      value,
      null,
      2
    ) + '\n',
    'utf8'
  );
}

function bindRunIntegrityToReleaseEvidence(
  integrity
) {
  const latest =
    readJson(
      latestRunFile,
      null
    );

  if (
    !latest ||
    typeof latest !== 'object'
  ) {
    console.error(
      '[QA Sentinel] Run Integrity could not be bound: latest-run.json is unavailable.'
    );
    return false;
  }

  const qaEvidenceValid =
    integrity?.qaEvidenceValid === true;

  const runIntegrity = {
    schemaVersion:
      integrity?.schemaVersion ?? 1,
    status:
      integrity?.status ?? 'UNKNOWN',
    qaEvidenceValid,
    evidenceAuthority:
      integrity?.evidenceAuthority ??
      (
        qaEvidenceValid
          ? 'VERIFIED'
          : 'NOT_VERIFIED'
      ),
    generatedAt:
      integrity?.generatedAt ??
      new Date().toISOString(),
  };

  const gateReleaseAssessment =
    assessment => {
      if (qaEvidenceValid) {
        return assessment;
      }

      return {
        ...(assessment ?? {}),
        status:
          'not-verified',
        verdict:
          'Release readiness is not verified because Run Integrity did not verify the QA evidence for this run.',
        recommendedAction:
          'Resolve Run Integrity blockers and rerun the complete QA suite before making a release decision.',
      };
    };

  const gatedLatest = {
    ...latest,
    runIntegrity,
    releaseAssessment:
      gateReleaseAssessment(
        latest.releaseAssessment
      ),
  };

  writeJson(
    latestRunFile,
    gatedLatest
  );

  const history =
    readJson(
      historyFile,
      []
    );

  if (!Array.isArray(history)) {
    console.error(
      '[QA Sentinel] Run Integrity could not be bound: history.json is not an array.'
    );
    return false;
  }

  let matched = false;

  const gatedHistory =
    history.map(entry => {
      const sameRun =
        Boolean(latest.runId) &&
        entry?.runId ===
          latest.runId;

      const sameFinishedAt =
        Boolean(latest.finishedAt) &&
        entry?.finishedAt ===
          latest.finishedAt;

      if (
        !sameRun &&
        !sameFinishedAt
      ) {
        return entry;
      }

      matched = true;

      return {
        ...entry,
        runIntegrity,
        releaseAssessment:
          gateReleaseAssessment(
            entry.releaseAssessment
          ),
      };
    });

  if (!matched) {
    console.error(
      '[QA Sentinel] Run Integrity could not be bound: the current run was not found in history.json.'
    );
    return false;
  }

  writeJson(
    historyFile,
    gatedHistory
  );

  if (!qaEvidenceValid) {
    console.warn(
      '[QA Sentinel] Run Integrity did not verify the evidence. Release readiness has been forced to NOT VERIFIED.'
    );
  }

  return true;
}

function escapeHtml(
  value
) {
  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    );
}

function suppressFailureReport(
  integrity
) {
  fs.mkdirSync(
    reportsDir,
    {
      recursive: true,
    }
  );

  const htmlFile =
    path.join(
      reportsDir,
      'failed-playwright-report.html'
    );

  const jsonFile =
    path.join(
      reportsDir,
      'failed-playwright-report.json'
    );

  const pdfFile =
    path.join(
      reportsDir,
      'failed-playwright-report.pdf'
    );

  try {
    fs.rmSync(
      pdfFile,
      {
        force: true,
      }
    );
  } catch {}

  const blockers =
    integrity?.blockers ??
    [];

  const infra =
    integrity
      ?.infrastructure
      ?.rootCauses ??
    [];

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>QA Sentinel Tyra - Report Suppressed</title>
<style>
body {
  font-family: Segoe UI, Arial, sans-serif;
  max-width: 900px;
  margin: 50px auto;
  padding: 30px;
  color: #172033;
}
h1 { color: #183b67; }
.alert {
  padding: 18px;
  border: 2px solid #b42318;
  background: #fff3f2;
  border-radius: 10px;
}
code {
  background: #f2f4f7;
  padding: 2px 5px;
}
</style>
</head>
<body>
<h1>QA Sentinel Tyra</h1>
<h2>Failed Playwright Report suppressed</h2>
<div class="alert">
<strong>QA evidence is not valid for product reporting.</strong>
<p>Run integrity: ${escapeHtml(integrity?.status ?? 'INVALID')}</p>
<p>Release authority: NOT VERIFIED</p>
</div>

<h3>Why</h3>
<ul>
${blockers.map(
  item =>
    `<li>${escapeHtml(item)}</li>`
).join('')}
</ul>

<h3>Infrastructure root causes</h3>
<ul>
${infra.map(
  item =>
    `<li><strong>${escapeHtml(item.title)}</strong> — ${Number(item.affectedExecutions ?? 0)} affected executions</li>`
).join('')}
</ul>

<p>
The normal product-failure report was intentionally not generated,
because infrastructure failures must not be presented as website defects.
</p>
</body>
</html>`;

  fs.writeFileSync(
    htmlFile,
    html,
    'utf8'
  );

  fs.writeFileSync(
    jsonFile,
    JSON.stringify(
      {
        generatedAt:
          new Date()
            .toISOString(),
        status:
          'suppressed',
        reason:
          'run-integrity-invalid',
        integrity,
      },
      null,
      2
    ),
    'utf8'
  );
}


console.log('');
console.log(
  '============================================================'
);

console.log(
  'QA SENTINEL TYRA — FULL QA'
);

console.log(
  '============================================================'
);

console.log('');
console.log(
  '[1/4] Run Integrity preflight'
);

const preflight =
  runNode(
    'scripts/qa-run-integrity.mjs',
    [
      'preflight',
    ]
  );

if (
  preflight.status !== 0
) {
  console.error('');
  console.error(
    '[QA Sentinel] FULL QA BLOCKED.'
  );

  console.error(
    '[QA Sentinel] Fix the environment issue shown above before testing the applications.'
  );

  process.exit(2);
}

const beforeMtime =
  fs.existsSync(
    latestRunFile
  )
    ? fs.statSync(
        latestRunFile
      ).mtimeMs
    : 0;

console.log('');
console.log(
  '[2/4] Full QA core'
);

const qa =
  runNpm(
    [
      'run',
      'qa:unattended:core',
    ],
    {
      /*
       * This wrapper has already completed the M8.1
       * preflight and executes the complete configured
       * Playwright scope.
       */
      QA_SENTINEL_RELEASE_SCOPE:
        'full',

      QA_SENTINEL_RUN_INTEGRITY_PREFLIGHT:
        'ready',
    }
  );

if (qa.error) {
  console.error(
    '[QA Sentinel] Full QA could not start:',
    qa.error.message
  );

  runNode(
    'scripts/qa-run-integrity.mjs',
    [
      'stale-run',
    ]
  );

  process.exit(2);
}

const afterMtime =
  fs.existsSync(
    latestRunFile
  )
    ? fs.statSync(
        latestRunFile
      ).mtimeMs
    : 0;

if (
  afterMtime <=
  beforeMtime
) {
  runNode(
    'scripts/qa-run-integrity.mjs',
    [
      'stale-run',
    ]
  );

  process.exit(
    qa.status ??
    2
  );
}

console.log('');
console.log(
  '[3/4] Run Integrity analysis'
);

runNode(
  'scripts/qa-run-integrity.mjs',
  [
    'postrun',
  ]
);

const integrity =
  readJson(
    integrityFile,
    null
  );

const integrityBindingOk =
  bindRunIntegrityToReleaseEvidence(
    integrity
  );

if (!integrityBindingOk) {
  console.error(
    '[QA Sentinel] FULL QA release evidence blocked because Run Integrity could not be bound safely.'
  );
  process.exit(2);
}

console.log('');
console.log(
  '[4/4] Failed Playwright Report'
);

if (
  integrity?.status ===
    'INVALID' ||
  integrity?.status ===
    'BLOCKED'
) {
  console.warn(
    '[QA Sentinel] Normal failure report suppressed because run integrity is invalid.'
  );

  suppressFailureReport(
    integrity
  );
} else {
  const report =
    runNpm([
      'run',
      'report:failed-playwright',
    ]);

  if (
    report.status !== 0
  ) {
    console.error(
      '[QA Sentinel] Failed Playwright Report generation failed.'
    );
  }
}

process.exit(
  qa.status ??
  1
);
