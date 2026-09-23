import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import path from 'node:path';
import process from 'node:process';


const root =
  process.cwd();

const reportFile =
  path.join(
    root,
    'reports',
    'security',
    'security-posture.json'
  );

const dashboardFile =
  path.join(
    root,
    'dashboard',
    'data',
    'security-posture.json'
  );

const triageFile =
  path.join(
    root,
    'config',
    'security-triage.json'
  );


function readJson(
  file,
  fallback
) {
  try {
    return JSON.parse(
      readFileSync(
        file,
        'utf8'
      )
    );
  } catch {
    return fallback;
  }
}


if (!existsSync(reportFile)) {
  console.error(
    '[Security Triage] security-posture.json does not exist.'
  );

  process.exit(2);
}


const report =
  readJson(
    reportFile,
    null
  );

if (!report) {
  console.error(
    '[Security Triage] Unable to parse security-posture.json.'
  );

  process.exit(2);
}


const triageConfig =
  readJson(
    triageFile,
    {
      schemaVersion: 2,
      entries: [],
    }
  );


const findings =
  Array.isArray(
    report.findings
  )
    ? report.findings
    : [];


function evidenceLine(
  finding
) {
  return (
    finding?.evidence?.line ??
    finding?.evidence?.start?.line ??
    null
  );
}


function findTriage(
  finding
) {
  const entries =
    Array.isArray(
      triageConfig.entries
    )
      ? triageConfig.entries
      : [];

  return (
    entries.find(
      entry => {
        if (
          entry.source &&
          entry.source !==
            finding.source
        ) {
          return false;
        }

        if (
          entry.ruleId &&
          entry.ruleId !==
            finding.ruleId
        ) {
          return false;
        }

        if (
          entry.target &&
          entry.target !==
            finding.target
        ) {
          return false;
        }

        if (
          entry.line != null &&
          Number(entry.line) !==
            Number(
              evidenceLine(
                finding
              )
            )
        ) {
          return false;
        }

        return true;
      }
    ) ??
    null
  );
}


for (const finding of findings) {
  const match =
    findTriage(
      finding
    );

  finding.triage = match
    ? {
        id:
          match.id,

        status:
          match.status,

        classification:
          match.classification ??
          null,

        reason:
          match.reason ??
          null,

        reviewed:
          true,
      }
    : {
        id: null,

        status:
          'needs-review',

        classification:
          null,

        reason:
          'No explicit triage decision exists for this scanner observation.',

        reviewed:
          false,
      };
}


/*
 * Scanner observations are never deleted.
 *
 * These statuses are retained for audit history
 * but are not counted as open vulnerabilities.
 */
const suppressedStatuses =
  new Set([
    'false-positive',
    'test-fixture',
    'fixed',
  ]);


const openFindings =
  findings.filter(
    finding =>
      !suppressedStatuses.has(
        finding.triage?.status
      )
  );


const suppressedFindings =
  findings.filter(
    finding =>
      suppressedStatuses.has(
        finding.triage?.status
      )
  );


function severityCounts(
  collection
) {
  const result = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (
    const finding of
    collection
  ) {
    const severity =
      String(
        finding.severity ??
        'info'
      ).toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(
        result,
        severity
      )
    ) {
      result[
        severity
      ] += 1;
    } else {
      result.info += 1;
    }
  }

  return result;
}


const rawSeverity =
  severityCounts(
    findings
  );

const actionableSeverity =
  severityCounts(
    openFindings
  );


const engines =
  report.coverage?.engines ??
  {};

const engineValues =
  Object.values(
    engines
  );


const notApplicableEngines =
  engineValues.filter(
    engine =>
      engine?.status ===
      'not-applicable'
  ).length;


const applicable =
  engineValues.filter(
    engine =>
      engine?.status !==
      'not-applicable'
  );


const completeEngines =
  applicable.filter(
    engine =>
      engine?.status ===
      'complete'
  ).length;


const unavailableEngines =
  applicable.filter(
    engine =>
      engine?.status ===
      'not-installed'
  ).length;


const errorEngines =
  applicable.filter(
    engine =>
      engine?.status ===
      'error'
  ).length;


const coveragePercent =
  applicable.length
    ? Math.round(
        (
          completeEngines /
          applicable.length
        ) * 100
      )
    : 100;


let postureStatus =
  'complete';

if (errorEngines > 0) {
  postureStatus =
    'partial';
} else if (
  unavailableEngines > 0 ||
  completeEngines <
    applicable.length
) {
  postureStatus =
    'degraded';
}


const confirmedFindings =
  openFindings.filter(
    finding =>
      finding.triage?.status ===
      'confirmed'
  ).length;


const needsReview =
  openFindings.filter(
    finding =>
      finding.triage?.status ===
      'needs-review'
  ).length;


const acceptedRisk =
  openFindings.filter(
    finding =>
      finding.triage?.status ===
      'accepted-risk'
  ).length;


const falsePositives =
  findings.filter(
    finding =>
      finding.triage?.status ===
      'false-positive'
  ).length;


const testFixtures =
  findings.filter(
    finding =>
      finding.triage?.status ===
      'test-fixture'
  ).length;


const fixedFindings =
  findings.filter(
    finding =>
      finding.triage?.status ===
      'fixed'
  ).length;


let findingStatus =
  'no-open-findings';

if (confirmedFindings > 0) {
  findingStatus =
    'confirmed-findings';
} else if (
  needsReview > 0
) {
  findingStatus =
    'review-required';
} else if (
  acceptedRisk > 0
) {
  findingStatus =
    'accepted-risk-present';
}


report.schemaVersion =
  Math.max(
    Number(
      report.schemaVersion ??
      1
    ),
    2
  );

report.triageSchemaVersion =
  2;

report.postureStatus =
  postureStatus;

report.findingStatus =
  findingStatus;


report.coverage = {
  ...(report.coverage ?? {}),

  engines,

  totalEngines:
    engineValues.length,

  applicableEngines:
    applicable.length,

  completeEngines,

  notApplicableEngines,

  unavailableEngines,

  errorEngines,

  coveragePercent,
};


report.summary = {
  ...(report.summary ?? {}),

  totalObservations:
    Number(
      report.summary
        ?.totalObservations ??
      findings.length
    ),

  uniqueFindings:
    findings.length,

  openFindings:
    openFindings.length,

  suppressedFindings:
    suppressedFindings.length,

  confirmedFindings,

  needsReview,

  acceptedRisk,

  falsePositives,

  testFixtures,

  fixedFindings,

  rawSeverity,

  /*
   * Top-level severity now means
   * currently open/actionable findings.
   */
  critical:
    actionableSeverity.critical,

  high:
    actionableSeverity.high,

  medium:
    actionableSeverity.medium,

  low:
    actionableSeverity.low,

  info:
    actionableSeverity.info,
};


report.note =
  'Coverage describes which security engines completed. Scanner observations are retained for auditability, while actionable severity counts exclude explicitly triaged false positives, test fixtures and fixed findings. Zero open findings is not proof that no vulnerabilities exist.';


if (
  report.authzFindingIntegration
) {
  report.authzFindingIntegration = {
    ...report.authzFindingIntegration,

    triagePending:
      false,
  };
}


writeFileSync(
  reportFile,
  JSON.stringify(
    report,
    null,
    2
  ),
  'utf8'
);

writeFileSync(
  dashboardFile,
  JSON.stringify(
    report,
    null,
    2
  ),
  'utf8'
);


console.log('');
console.log(
  '============================================================'
);

console.log(
  'QA SENTINEL TYRA — TRIAGED SECURITY POSTURE'
);

console.log(
  '============================================================'
);

console.log(
  `Evidence status: ${postureStatus.toUpperCase()}`
);

console.log(
  `Evidence coverage: ${coveragePercent}%`
);

console.log(
  `Applicable engines: ${completeEngines}/${applicable.length}`
);

console.log('');

console.log(
  `Raw observations: ${report.summary.totalObservations}`
);

console.log(
  `Unique findings: ${findings.length}`
);

console.log(
  `Open findings: ${openFindings.length}`
);

console.log(
  `Confirmed: ${confirmedFindings}`
);

console.log(
  `Needs review: ${needsReview}`
);

console.log(
  `False positives: ${falsePositives}`
);

console.log('');

console.log(
  `Actionable critical: ${actionableSeverity.critical}`
);

console.log(
  `Actionable high: ${actionableSeverity.high}`
);

console.log(
  `Actionable medium: ${actionableSeverity.medium}`
);

console.log(
  `Actionable low: ${actionableSeverity.low}`
);
