import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(
  process.cwd(),
  'dashboard/data'
);

const HISTORY_LIMIT = Number(
  process.env.QA_DISCOVERY_HISTORY_LIMIT ?? 20
);

const sites = [
  {
    id: 'nation',
    label: 'Nation',
  },
  {
    id: 'ai-skills',
    label: 'AI Skills',
  },
];

function readJson(file) {
  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, 'utf8')
    );
  } catch {
    return null;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(
    path.dirname(file),
    { recursive: true }
  );

  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2) + '\n',
    'utf8'
  );
}

function requestedPath(page) {
  if (page?.requestedPathname) {
    return page.requestedPathname;
  }

  if (page?.pathname) {
    return page.pathname;
  }

  try {
    return new URL(page.url).pathname;
  } catch {
    return '/';
  }
}

function finalPath(page) {
  if (page?.finalPathname) {
    return page.finalPathname;
  }

  try {
    return new URL(
      page.finalUrl ?? page.url
    ).pathname;
  } catch {
    return requestedPath(page);
  }
}

function isDynamic(pathname) {
  return (
    /^\/posts\/[^/]+$/i.test(pathname) ||
    /^\/jobs\/[^/]+$/i.test(pathname) ||
    /^\/skills\/[^/]+$/i.test(pathname) ||
    /\/tasks\/[^/]+$/i.test(pathname)
  );
}

function authVerified(report) {
  if (!report) {
    return false;
  }

  if (
    report.authenticated !== true ||
    report.storageStateLoaded !== true
  ) {
    return false;
  }

  // Older verified Nation reports predate
  // authSessionVerified.
  return report.authSessionVerified !== false;
}

function impactFindings(report, mode) {
  if (!report) {
    return [];
  }

  const results = [];

  for (const page of report.pages ?? []) {
    for (const finding of page.findings ?? []) {
      const severity = String(
        finding.severity ?? ''
      ).toLowerCase();

      if (
        finding.userImpact !== true &&
        severity !== 'error' &&
        severity !== 'critical'
      ) {
        continue;
      }

      const pathname = requestedPath(page);

      results.push({
        fingerprint: [
          mode,
          pathname,
          finding.code ?? 'DISCOVERY_FINDING',
          finding.title ?? 'Discovery finding',
        ].join('|'),

        mode,
        pathname,
        severity: severity || 'warning',
        code:
          finding.code ??
          'DISCOVERY_FINDING',

        title:
          finding.title ??
          'Discovery finding',

        category:
          finding.category ??
          'discovery',
      });
    }
  }

  return results;
}

function buildHistory(
  site,
  anonymous,
  authenticated,
  authenticatedIsVerified,
  currentFindings
) {
  const historyFile = path.join(
    dataDir,
    `discovery-history-${site.id}.json`
  );

  const old = readJson(historyFile) ?? {
    schemaVersion: 1,
    siteId: site.id,
    snapshots: [],
  };

  const snapshots = Array.isArray(old.snapshots)
    ? [...old.snapshots]
    : [];

  const snapshotId = [
    anonymous?.scannedAt ?? 'no-anon',
    authenticatedIsVerified
      ? authenticated?.scannedAt ?? 'no-auth'
      : 'auth-not-verified',
  ].join('|');

  if (
    !snapshots.some(
      item => item.snapshotId === snapshotId
    )
  ) {
    snapshots.push({
      snapshotId,
      generatedAt:
        new Date().toISOString(),

      anonymousScannedAt:
        anonymous?.scannedAt ?? null,

      authenticatedScannedAt:
        authenticatedIsVerified
          ? authenticated?.scannedAt ?? null
          : null,

      authenticatedVerified:
        authenticatedIsVerified,

      findings:
        currentFindings,
    });
  }

  while (
    snapshots.length > HISTORY_LIMIT
  ) {
    snapshots.shift();
  }

  const map = new Map();

  snapshots.forEach((snapshot, index) => {
    for (
      const finding
      of snapshot.findings ?? []
    ) {
      if (!map.has(finding.fingerprint)) {
        map.set(
          finding.fingerprint,
          {
            ...finding,
            indexes: [],
          }
        );
      }

      map
        .get(finding.fingerprint)
        .indexes
        .push(index);
    }
  });

  const currentIndex =
    snapshots.length - 1;

  const intelligence = [];

  for (const item of map.values()) {
    const occurrences =
      item.indexes.length;

    const first =
      item.indexes[0];

    const last =
      item.indexes.at(-1);

    const currentPresent =
      last === currentIndex;

    const hadGap =
      item.indexes.some(
        (value, index) =>
          index > 0 &&
          value -
            item.indexes[index - 1] >
            1
      );

    let state = 'not-reproduced';

    if (
      currentPresent &&
      occurrences === 1
    ) {
      state = 'new';
    } else if (
      currentPresent &&
      hadGap
    ) {
      state = 'intermittent';
    } else if (
      currentPresent &&
      occurrences >= 2
    ) {
      state = 'recurring';
    }

    intelligence.push({
      fingerprint:
        item.fingerprint,

      mode:
        item.mode,

      pathname:
        item.pathname,

      severity:
        item.severity,

      code:
        item.code,

      title:
        item.title,

      category:
        item.category,

      state,
      currentPresent,
      occurrences,

      observations:
        snapshots.length,

      firstSeen:
        snapshots[first]
          ?.generatedAt ??
        null,

      lastSeen:
        snapshots[last]
          ?.generatedAt ??
        null,
    });
  }

  intelligence.sort(
    (a, b) => {
      const order = {
        critical: 0,
        error: 1,
        warning: 2,
        info: 3,
      };

      return (
        (order[a.severity] ?? 9) -
          (order[b.severity] ?? 9) ||
        b.occurrences -
          a.occurrences
      );
    }
  );

  const history = {
    schemaVersion: 1,
    siteId: site.id,
    snapshotCount:
      snapshots.length,
    historyLimit:
      HISTORY_LIMIT,
    snapshots,
    findings:
      intelligence,
  };

  writeJson(
    historyFile,
    history
  );

  return history;
}

function buildSite(site) {
  const anonymousFile =
    path.join(
      dataDir,
      `discovered-pages-${site.id}.json`
    );

  const authFile =
    path.join(
      dataDir,
      `discovered-pages-${site.id}-authenticated.json`
    );

  const anonymous =
    readJson(anonymousFile);

  const authenticated =
    readJson(authFile);

  if (!anonymous) {
    console.log(
      `${site.label}: anonymous report missing`
    );

    return null;
  }

  const verifiedAuth =
    authVerified(authenticated);

  const anonymousRoutes =
    new Set(
      (anonymous.pages ?? [])
        .map(requestedPath)
    );

  const authenticatedRoutes =
    verifiedAuth
      ? new Set(
          (authenticated.pages ?? [])
            .map(requestedPath)
        )
      : new Set();

  const anonymousEffective =
    new Set(
      (anonymous.pages ?? [])
        .map(finalPath)
    );

  const authenticatedEffective =
    verifiedAuth
      ? new Set(
          (authenticated.pages ?? [])
            .map(finalPath)
        )
      : new Set();

  const uniqueRoutes =
    new Set([
      ...anonymousRoutes,
      ...authenticatedRoutes,
    ]);

  const effectiveRoutes =
    new Set([
      ...anonymousEffective,
      ...authenticatedEffective,
    ]);

  const shared =
    verifiedAuth
      ? [...anonymousRoutes].filter(
          route =>
            authenticatedRoutes.has(route)
        )
      : [];

  const anonOnly =
    verifiedAuth
      ? [...anonymousRoutes].filter(
          route =>
            !authenticatedRoutes.has(route)
        )
      : [];

  const authOnly =
    verifiedAuth
      ? [...authenticatedRoutes].filter(
          route =>
            !anonymousRoutes.has(route)
        )
      : [];

  const dynamic =
    [...uniqueRoutes].filter(
      isDynamic
    );

  const currentFindings = [
    ...impactFindings(
      anonymous,
      'anonymous'
    ),

    ...(
      verifiedAuth
        ? impactFindings(
            authenticated,
            'authenticated'
          )
        : []
    ),
  ];

  const history =
    buildHistory(
      site,
      anonymous,
      authenticated,
      verifiedAuth,
      currentFindings
    );

  const result = {
    schemaVersion: 3,

    siteId:
      site.id,

    siteLabel:
      site.label,

    generatedAt:
      new Date().toISOString(),

    authenticatedVerified:
      verifiedAuth,

    authentication: {
      reportAvailable:
        Boolean(authenticated),

      storageStateLoaded:
        authenticated
          ?.storageStateLoaded === true,

      sessionVerified:
        authenticated
          ?.authSessionVerified ??
        (
          verifiedAuth
            ? true
            : false
        ),

      probeResults:
        authenticated
          ?.authProbeResults ??
        [],
    },

    coverage: {
      pageObservations:
        anonymous.totalPages +
        (
          verifiedAuth
            ? authenticated.totalPages
            : 0
        ),

      anonymousRoutes:
        anonymousRoutes.size,

      authenticatedRoutes:
        verifiedAuth
          ? authenticatedRoutes.size
          : null,

      uniqueRoutes:
        uniqueRoutes.size,

      effectiveRoutes:
        effectiveRoutes.size,

      sharedRoutes:
        verifiedAuth
          ? shared.length
          : null,

      anonymousOnlyRoutes:
        verifiedAuth
          ? anonOnly.length
          : null,

      authenticatedOnlyRoutes:
        verifiedAuth
          ? authOnly.length
          : null,

      dynamicContentRoutes:
        dynamic.length,

      anonymousCoverageLimited:
        Boolean(
          anonymous.coverageLimited
        ),

      authenticatedCoverageLimited:
        verifiedAuth
          ? Boolean(
              authenticated
                .coverageLimited
            )
          : null,
    },

    interactions: {
      anonymousClicks:
        anonymous
          .totalInteractionClicks ??
        0,

      authenticatedClicks:
        verifiedAuth
          ? (
              authenticated
                .totalInteractionClicks ??
              0
            )
          : null,

      totalClicks:
        (
          anonymous
            .totalInteractionClicks ??
          0
        ) +
        (
          verifiedAuth
            ? (
                authenticated
                  .totalInteractionClicks ??
                0
              )
            : 0
        ),
    },

    findings: {
      current:
        currentFindings,

      currentCount:
        currentFindings.length,

      historical:
        history.findings,

      intermittentCount:
        history.findings.filter(
          item =>
            item.state ===
            'intermittent'
        ).length,

      recurringCount:
        history.findings.filter(
          item =>
            item.state ===
            'recurring'
        ).length,

      notReproducedCount:
        history.findings.filter(
          item =>
            item.state ===
            'not-reproduced'
        ).length,
    },

    routes: {
      shared,
      anonymousOnly:
        anonOnly,

      authenticatedOnly:
        authOnly,

      dynamic,
    },
  };

  writeJson(
    path.join(
      dataDir,
      `discovery-coverage-${site.id}.json`
    ),
    result
  );

  return result;
}

const siteResults = {};

for (const site of sites) {
  const result =
    buildSite(site);

  if (result) {
    siteResults[site.id] =
      result;
  }
}

const values =
  Object.values(siteResults);

const verifiedSites =
  values.filter(
    site =>
      site.authenticatedVerified
  );

const all = {
  schemaVersion: 3,
  scope: 'all',

  generatedAt:
    new Date().toISOString(),

  authStatus:
    values.length > 0 &&
    verifiedSites.length ===
      values.length
      ? 'complete'
      : verifiedSites.length > 0
        ? 'partial'
        : 'unverified',

  coverage: {
    pageObservations:
      values.reduce(
        (sum, site) =>
          sum +
          site.coverage
            .pageObservations,
        0
      ),

    anonymousRoutes:
      values.reduce(
        (sum, site) =>
          sum +
          site.coverage
            .anonymousRoutes,
        0
      ),

    authenticatedRoutes:
      verifiedSites.reduce(
        (sum, site) =>
          sum +
          (
            site.coverage
              .authenticatedRoutes ??
            0
          ),
        0
      ),

    uniqueRoutes:
      values.reduce(
        (sum, site) =>
          sum +
          site.coverage
            .uniqueRoutes,
        0
      ),

    effectiveRoutes:
      values.reduce(
        (sum, site) =>
          sum +
          site.coverage
            .effectiveRoutes,
        0
      ),

    sharedRoutes:
      verifiedSites.reduce(
        (sum, site) =>
          sum +
          (
            site.coverage
              .sharedRoutes ??
            0
          ),
        0
      ),

    anonymousOnlyRoutes:
      verifiedSites.reduce(
        (sum, site) =>
          sum +
          (
            site.coverage
              .anonymousOnlyRoutes ??
            0
          ),
        0
      ),

    authenticatedOnlyRoutes:
      verifiedSites.reduce(
        (sum, site) =>
          sum +
          (
            site.coverage
              .authenticatedOnlyRoutes ??
            0
          ),
        0
      ),

    dynamicContentRoutes:
      values.reduce(
        (sum, site) =>
          sum +
          site.coverage
            .dynamicContentRoutes,
        0
      ),

    coverageLimited:
      values.some(
        site =>
          site.coverage
            .anonymousCoverageLimited ||
          site.coverage
            .authenticatedCoverageLimited ===
              true
      ),
  },

  interactions: {
    totalClicks:
      values.reduce(
        (sum, site) =>
          sum +
          site.interactions
            .totalClicks,
        0
      ),
  },

  findings: {
    current:
      values.flatMap(
        site =>
          site.findings.current.map(
            finding => ({
              siteId:
                site.siteId,
              siteLabel:
                site.siteLabel,
              ...finding,
            })
          )
      ),

    historical:
      values.flatMap(
        site =>
          site.findings.historical.map(
            finding => ({
              siteId:
                site.siteId,
              siteLabel:
                site.siteLabel,
              ...finding,
            })
          )
      ),
  },

  routes: {
    authenticatedOnly:
      values.flatMap(
        site =>
          site.routes
            .authenticatedOnly.map(
              route =>
                `${site.siteLabel}: ${route}`
            )
      ),
  },

  sites:
    siteResults,
};

all.findings.currentCount =
  all.findings.current.length;

all.findings.intermittentCount =
  all.findings.historical.filter(
    item =>
      item.state ===
      'intermittent'
  ).length;

all.findings.recurringCount =
  all.findings.historical.filter(
    item =>
      item.state ===
      'recurring'
  ).length;

all.findings.notReproducedCount =
  all.findings.historical.filter(
    item =>
      item.state ===
      'not-reproduced'
  ).length;

writeJson(
  path.join(
    dataDir,
    'discovery-coverage-all.json'
  ),
  all
);

console.log('');
console.log(
  '=============================================='
);
console.log(
  ' QA SENTINEL TYRA — DISCOVERY COVERAGE V2'
);
console.log(
  '=============================================='
);

for (const site of values) {
  console.log('');
  console.log(site.siteLabel);

  console.log(
    `  Anonymous routes    : ${site.coverage.anonymousRoutes}`
  );

  console.log(
    `  Authenticated       : ${
      site.authenticatedVerified
        ? site.coverage.authenticatedRoutes
        : 'NOT VERIFIED'
    }`
  );

  console.log(
    `  Unique routes       : ${site.coverage.uniqueRoutes}`
  );

  console.log(
    `  Effective routes    : ${site.coverage.effectiveRoutes}`
  );

  console.log(
    `  Safe interactions   : ${site.interactions.totalClicks}`
  );

  console.log(
    `  Current findings    : ${site.findings.currentCount}`
  );
}

console.log('');
console.log(
  `Both sites auth status: ${all.authStatus.toUpperCase()}`
);

console.log(
  '=============================================='
);
