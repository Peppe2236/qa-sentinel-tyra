import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();

const CONFIG_PATH =
  path.join(ROOT, 'config', 'authz-security.json');

const REPORT_DIR =
  path.join(ROOT, 'reports', 'security', 'authz');

const REPORT_JSON =
  path.join(REPORT_DIR, 'authz-security.json');

const REPORT_MD =
  path.join(REPORT_DIR, 'authz-security.md');

const DASHBOARD_JSON =
  path.join(
    ROOT,
    'dashboard',
    'data',
    'authz-security.json'
  );

const args =
  process.argv.slice(2);

const modeIndex =
  args.indexOf('--mode');

const mode =
  modeIndex >= 0
    ? args[modeIndex + 1]
    : 'production-safe';

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      'utf8'
    )
  );
}

function ensureDir(filePath) {
  fs.mkdirSync(
    path.dirname(filePath),
    {
      recursive: true,
    }
  );
}

function writeJson(
  filePath,
  value
) {
  ensureDir(filePath);

  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    'utf8'
  );
}

function normalizePathname(value) {
  if (!value) {
    return '/';
  }

  const trimmed =
    value.length > 1
      ? value.replace(/\/+$/, '')
      : value;

  return trimmed || '/';
}

function safeUrl(raw) {
  try {
    const url =
      new URL(raw);

    return {
      origin:
        url.origin,

      host:
        url.host,

      pathname:
        url.pathname,

      href:
        `${url.origin}${url.pathname}`,
    };
  }
  catch {
    return {
      origin: '',
      host: '',
      pathname: '',
      href: '',
    };
  }
}

function isAuthUrl(
  raw,
  patterns = []
) {
  const value =
    String(raw || '')
      .toLowerCase();

  return patterns.some(
    pattern =>
      value.includes(
        String(pattern)
          .toLowerCase()
      )
  );
}

function cookieMetadata(cookie) {
  return {
    name:
      cookie.name,

    domain:
      cookie.domain,

    path:
      cookie.path,

    httpOnly:
      Boolean(
        cookie.httpOnly
      ),

    secure:
      Boolean(
        cookie.secure
      ),

    sameSite:
      cookie.sameSite ??
      'Unspecified',

    expires:
      cookie.expires ??
      -1,
  };
}

function finding({
  severity,
  title,
  target,
  description,
  evidence,
  recommendation,
}) {
  return {
    source:
      'Tyra Auth/AuthZ',

    category:
      'authorization',

    severity,

    status:
      'open',

    confidence:
      'high',

    title,
    target,
    description,
    evidence,
    recommendation,
  };
}

async function gotoEvidence(
  page,
  url,
  timeoutMs,
  settleMs
) {
  const startedAt =
    Date.now();

  try {
    const response =
      await page.goto(
        url,
        {
          waitUntil:
            'domcontentloaded',

          timeout:
            timeoutMs,
        }
      );

    const initialUrl =
      page.url();

    /*
     * Authentication redirects on SPA/Next.js applications
     * may happen during hydration after DOMContentLoaded.
     *
     * Do not classify authorization until the page has had
     * time to settle.
     */
    await page.waitForTimeout(
      settleMs
    );

    const finalUrl =
      page.url();

    return {
      ok:
        true,

      requestedUrl:
        url,

      initialUrl,

      finalUrl,

      redirectedAfterLoad:
        initialUrl !==
        finalUrl,

      status:
        response?.status() ??
        null,

      elapsedMs:
        Date.now() -
        startedAt,
    };
  }
  catch (error) {
    return {
      ok:
        false,

      requestedUrl:
        url,

      initialUrl:
        page.url(),

      finalUrl:
        page.url(),

      redirectedAfterLoad:
        false,

      status:
        null,

      elapsedMs:
        Date.now() -
        startedAt,

      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

function classifyProtectedRoute({
  observation,
  site,
  route,
  expectedAuthenticated,
}) {
  const requested =
    new URL(
      route,
      site.origin
    );

  const final =
    safeUrl(
      observation.finalUrl
    );

  const loginLike =
    isAuthUrl(
      observation.finalUrl,
      site.authRedirectPatterns
    );

  const deniedStatus =
    observation.status === 401 ||
    observation.status === 403;

  const sameOrigin =
    final.origin ===
    requested.origin;

  const requestedPath =
    normalizePathname(
      requested.pathname
    );

  const finalPath =
    normalizePathname(
      final.pathname
    );

  const stayedOnProtectedPath =
    sameOrigin &&
    finalPath ===
      requestedPath;

  const successfulStatus =
    observation.status !== null &&
    observation.status < 400;

  if (!expectedAuthenticated) {
    const denied =
      deniedStatus ||
      loginLike ||
      !stayedOnProtectedPath;

    return {
      result:
        denied
          ? 'pass'
          : successfulStatus
            ? 'fail'
            : 'needs-review',

      denied,
      loginLike,
      deniedStatus,
      stayedOnProtectedPath,
    };
  }

  const authenticated =
    successfulStatus &&
    stayedOnProtectedPath &&
    !loginLike;

  return {
    result:
      authenticated
        ? 'pass'
        : 'needs-review',

    authenticated,
    loginLike,
    deniedStatus,
    stayedOnProtectedPath,
  };
}

async function checkRouteSet(
  browser,
  site,
  state,
  profile,
  expectedAuthenticated,
  timeoutMs,
  settleMs
) {
  const contextOptions =
    state
      ? {
          storageState:
            state,
        }
      : {};

  const context =
    await browser.newContext(
      contextOptions
    );

  const results = [];

  try {
    if (
      profile ===
      'cleared-session'
    ) {
      await context.clearCookies();

      await context.addInitScript(
        () => {
          try {
            localStorage.clear();
          }
          catch {}

          try {
            sessionStorage.clear();
          }
          catch {}
        }
      );
    }

    const page =
      await context.newPage();

    for (
      const route
      of site.protectedRoutes
    ) {
      const url =
        new URL(
          route,
          site.origin
        ).href;

      const observation =
        await gotoEvidence(
          page,
          url,
          timeoutMs,
          settleMs
        );

      const classification =
        classifyProtectedRoute({
          observation,
          site,
          route,
          expectedAuthenticated,
        });

      results.push({
        profile,
        route,
        ...observation,
        ...classification,
      });
    }
  }
  finally {
    await context.close();
  }

  return results;
}

function assessCookies(
  site,
  state
) {
  const cookies =
    Array.isArray(
      state?.cookies
    )
      ? state.cookies
      : [];

  const names =
    new Set(
      site.sessionCookieNames ||
      []
    );

  const relevant =
    cookies.filter(
      cookie =>
        names.has(
          cookie.name
        )
    );

  const checks = [];
  const findings = [];

  if (
    relevant.length === 0
  ) {
    checks.push({
      status:
        'not-verified',

      reason:
        'No declared session cookie was present in the saved storage state.',

      declaredSessionCookieNames:
        [...names],
    });

    return {
      checks,
      findings,
      cookies: [],
    };
  }

  for (
    const cookie
    of relevant
  ) {
    const meta =
      cookieMetadata(
        cookie
      );

    const problems = [];

    if (!cookie.secure) {
      problems.push(
        'Secure=false'
      );
    }

    if (!cookie.httpOnly) {
      problems.push(
        'HttpOnly=false'
      );
    }

    if (
      !cookie.sameSite ||
      cookie.sameSite ===
        'None'
    ) {
      problems.push(
        `SameSite=${
          cookie.sameSite ??
          'Unspecified'
        }`
      );
    }

    checks.push({
      status:
        problems.length
          ? 'fail'
          : 'pass',

      cookie:
        meta,

      problems,
    });

    if (
      problems.length
    ) {
      findings.push(
        finding({
          severity:
            'medium',

          title:
            `${site.name} session cookie flags need review`,

          target:
            `${cookie.name} @ ${cookie.domain}`,

          description:
            'A declared authentication/session cookie is missing one or more expected defensive flags.',

          evidence:
            problems.join(', '),

          recommendation:
            'Set Secure and HttpOnly for session cookies and use an appropriate SameSite policy unless the authentication design explicitly requires otherwise.',
        })
      );
    }
  }

  return {
    checks,

    findings,

    cookies:
      relevant.map(
        cookieMetadata
      ),
  };
}

function routeFindings(
  site,
  anonymous,
  cleared
) {
  const failures =
    new Map();

  for (
    const result
    of [
      ...anonymous,
      ...cleared,
    ]
  ) {
    if (
      result.result !==
      'fail'
    ) {
      continue;
    }

    const key =
      result.route;

    if (
      !failures.has(key)
    ) {
      failures.set(
        key,
        []
      );
    }

    failures
      .get(key)
      .push(result);
  }

  const findings = [];

  for (
    const [route, observations]
    of failures
  ) {
    const profiles =
      observations.map(
        item =>
          item.profile
      );

    const evidence =
      observations.map(
        item =>
          `${item.profile}: HTTP ${
            item.status ??
            'unknown'
          }; final URL ${
            safeUrl(
              item.finalUrl
            ).href ||
            'unknown'
          }`
      );

    findings.push(
      finding({
        severity:
          'high',

        title:
          `${site.name} protected route accessible without a valid session`,

        target:
          new URL(
            route,
            site.origin
          ).href,

        description:
          `The declared protected route remained accessible without a valid session for: ${profiles.join(', ')}.`,

        evidence:
          evidence.join(
            ' | '
          ),

        recommendation:
          'Enforce authorization on the server for this route and ensure unauthenticated or cleared-session requests are denied or redirected before protected content is returned.',
      })
    );
  }

  return findings;
}

function siteCoverage(
  siteResult
) {
  const allAnonymous =
    siteResult.routes
      .anonymous
      .every(
        item =>
          item.result ===
          'pass'
      );

  const allAuthenticated =
    siteResult.routes
      .authenticated
      .every(
        item =>
          item.result ===
          'pass'
      );

  const allCleared =
    siteResult.routes
      .clearedSession
      .every(
        item =>
          item.result ===
          'pass'
      );

  const cookiesVerified =
    siteResult
      .sessionCookies
      .checks
      .length > 0 &&
    siteResult
      .sessionCookies
      .checks
      .every(
        item =>
          item.status ===
          'pass'
      );

  return {
    anonymousProtectedRoutes:
      allAnonymous
        ? 'verified'
        : 'needs-review',

    authenticatedProtectedRoutes:
      allAuthenticated
        ? 'verified'
        : 'needs-review',

    clearedSessionProtectedRoutes:
      allCleared
        ? 'verified'
        : 'needs-review',

    sessionCookieFlags:
      cookiesVerified
        ? 'verified'
        : 'not-verified',

    serverApiAuthorization:
      'not-verified',

    serverSideLogoutInvalidation:
      'not-verified',

    crossUserAuthorization:
      'not-verified',

    roleAuthorization:
      'not-verified',

    objectOwnershipIdor:
      'not-verified',
  };
}

function renderMarkdown(
  report
) {
  const lines = [];

  lines.push(
    '# QA Sentinel Tyra — Auth/AuthZ Security Evidence'
  );

  lines.push('');

  lines.push(
    `- Generated: ${report.generatedAt}`
  );

  lines.push(
    `- Mode: ${report.mode}`
  );

  lines.push(
    `- Run status: ${report.runStatus}`
  );

  lines.push(
    `- Coverage status: ${report.coverageStatus}`
  );

  lines.push(
    `- Findings: ${report.summary.openFindings}`
  );

  lines.push('');

  lines.push(
    'This is bounded evidence for the checks that ran. It is not proof that no authorization vulnerabilities exist.'
  );

  lines.push('');

  for (
    const site
    of report.sites
  ) {
    lines.push(
      `## ${site.name}`
    );

    lines.push('');

    if (
      !site.routes
    ) {
      lines.push(
        `- Status: ${site.status}`
      );

      lines.push('');
      continue;
    }

    lines.push(
      `- Protected routes: ${site.protectedRoutes.join(', ')}`
    );

    lines.push(
      `- Anonymous route checks: ${
        site.routes.anonymous.filter(
          x =>
            x.result ===
            'pass'
        ).length
      }/${site.routes.anonymous.length} pass`
    );

    lines.push(
      `- Authenticated route checks: ${
        site.routes.authenticated.filter(
          x =>
            x.result ===
            'pass'
        ).length
      }/${site.routes.authenticated.length} pass`
    );

    lines.push(
      `- Cleared-session checks: ${
        site.routes.clearedSession.filter(
          x =>
            x.result ===
            'pass'
        ).length
      }/${site.routes.clearedSession.length} pass`
    );

    lines.push(
      `- Session cookies inspected: ${
        site.sessionCookies.cookies.length
      }`
    );

    lines.push('');
  }

  lines.push(
    '## Explicitly not verified'
  );

  lines.push('');

  lines.push(
    '- Cross-user authorization / IDOR: requires at least two approved dedicated accounts and declared resources.'
  );

  lines.push(
    '- Role authorization: requires approved role-specific accounts or fixtures.'
  );

  lines.push(
    '- Server/API authorization: requires explicitly declared safe private API contracts; no production fuzzing is performed.'
  );

  lines.push(
    '- Server-side logout invalidation: not exercised because logging out could invalidate the saved canonical session token.'
  );

  lines.push('');

  if (
    report.findings.length
  ) {
    lines.push(
      '## Open findings'
    );

    lines.push('');

    for (
      const item
      of report.findings
    ) {
      lines.push(
        `- **${item.severity.toUpperCase()}** — ${item.title} — ${item.target}`
      );
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  if (
    !fs.existsSync(
      CONFIG_PATH
    )
  ) {
    throw new Error(
      `Missing config: ${CONFIG_PATH}`
    );
  }

  const config =
    readJson(
      CONFIG_PATH
    );

  if (
    ![
      'production-safe',
      'repository-only',
    ].includes(mode)
  ) {
    throw new Error(
      `Unsupported mode: ${mode}`
    );
  }

  const report = {
    schemaVersion:
      1,

    source:
      'Tyra Auth/AuthZ',

    generatedAt:
      new Date()
        .toISOString(),

    mode,

    runStatus:
      'complete',

    coverageStatus:
      'partial',

    authorization: {
      required:
        mode ===
        'production-safe',

      environmentVariable:
        config.authorizationEnvironmentVariable,

      granted:
        false,
    },

    safety: {
      networkPolicy:
        mode ===
        'production-safe'
          ? 'safe-get-navigation-only'
          : 'no-network',

      productionMutation:
        false,

      bruteForce:
        false,

      fuzzing:
        false,

      idEnumeration:
        false,

      canonicalStorageStateMutation:
        false,
    },

    summary: {
      sitesConfigured:
        config.sites.length,

      sitesChecked:
        0,

      routeChecks:
        0,

      openFindings:
        0,

      high:
        0,

      medium:
        0,

      low:
        0,
    },

    sites: [],

    findings: [],

    notVerified: [
      'cross-user-authorization',
      'role-authorization',
      'object-ownership-idor',
      'server-api-authorization',
      'server-side-logout-invalidation',
    ],

    note:
      'No automated scanner can prove the absence of authorization vulnerabilities. NOT VERIFIED dimensions remain explicit.',
  };

  if (
    mode ===
    'repository-only'
  ) {
    report.sites =
      config.sites.map(
        site => ({
          id:
            site.id,

          name:
            site.name,

          status:
            'not-applicable',

          reason:
            'Repository-only mode performs no network or session checks.',
        })
      );

    writeJson(
      REPORT_JSON,
      report
    );

    writeJson(
      DASHBOARD_JSON,
      report
    );

    ensureDir(
      REPORT_MD
    );

    fs.writeFileSync(
      REPORT_MD,
      renderMarkdown(
        report
      ),
      'utf8'
    );

    console.log(
      'Auth/AuthZ repository-only evidence written.'
    );

    return;
  }

  const authVar =
    config.authorizationEnvironmentVariable ||
    'QA_PENTEST_AUTHORIZED';

  const authorized =
    String(
      process.env[
        authVar
      ] || ''
    ).toLowerCase() ===
    'true';

  report.authorization.granted =
    authorized;

  if (!authorized) {
    report.runStatus =
      'blocked';

    report.coverageStatus =
      'not-run';

    report.note =
      `${authVar}=true is required for production-safe Auth/AuthZ network checks. Nothing was sent.`;

    writeJson(
      REPORT_JSON,
      report
    );

    writeJson(
      DASHBOARD_JSON,
      report
    );

    ensureDir(
      REPORT_MD
    );

    fs.writeFileSync(
      REPORT_MD,
      renderMarkdown(
        report
      ),
      'utf8'
    );

    console.error(
      report.note
    );

    process.exitCode =
      2;

    return;
  }

  const browser =
    await chromium.launch({
      headless:
        true,
    });

  try {
    for (
      const site
      of config.sites
    ) {
      const statePath =
        path.resolve(
          ROOT,
          site.authState
        );

      const siteResult = {
        id:
          site.id,

        name:
          site.name,

        origin:
          site.origin,

        protectedRoutes:
          site.protectedRoutes,

        authState:
          site.authState,

        status:
          'complete',

        routes: {
          anonymous: [],
          authenticated: [],
          clearedSession: [],
        },

        sessionCookies: {
          cookies: [],
          checks: [],
        },

        apiAuthorization: {
          status:
            'not-verified',

          reason:
            'No explicitly declared safe private API authorization contract is configured for active verification.',

          observationOnlyEndpoints:
            site.observationOnlyEndpoints ||
            [],
        },

        logoutInvalidation: {
          status:
            'not-verified',

          reason:
            'Server-side logout is intentionally not invoked because it may invalidate the canonical saved session token.',
        },

        multiUserAuthorization: {
          status:
            'not-verified',

          reason:
            'A second approved dedicated account and declared owned resources are not configured.',
        },

        roleAuthorization: {
          status:
            'not-verified',

          reason:
            'Role-specific approved accounts or fixtures are not configured.',
        },

        objectOwnershipIdor: {
          status:
            'not-verified',

          reason:
            'No explicit safe object/resource matrix is configured; arbitrary identifier enumeration is prohibited.',
        },
      };

      if (
        !fs.existsSync(
          statePath
        )
      ) {
        siteResult.status =
          'blocked';

        siteResult.reason =
          `Missing storage state: ${site.authState}`;

        siteResult.coverage =
          siteCoverage(
            siteResult
          );

        report.sites.push(
          siteResult
        );

        continue;
      }

      const state =
        readJson(
          statePath
        );

      const timeoutMs =
        Number(
          config.timeoutMs ||
          20000
        );

      const settleMs =
        Number(
          config.authSettleMs ||
          1500
        );

      siteResult.routes.anonymous =
        await checkRouteSet(
          browser,
          site,
          null,
          'anonymous',
          false,
          timeoutMs,
          settleMs
        );

      siteResult.routes.authenticated =
        await checkRouteSet(
          browser,
          site,
          state,
          'authenticated-user-a',
          true,
          timeoutMs,
          settleMs
        );

      siteResult.routes.clearedSession =
        await checkRouteSet(
          browser,
          site,
          state,
          'cleared-session',
          false,
          timeoutMs,
          settleMs
        );

      const cookieAssessment =
        assessCookies(
          site,
          state
        );

      siteResult.sessionCookies = {
        cookies:
          cookieAssessment.cookies,

        checks:
          cookieAssessment.checks,
      };

      const siteFindings = [
        ...routeFindings(
          site,
          siteResult.routes
            .anonymous,
          siteResult.routes
            .clearedSession
        ),

        ...cookieAssessment
          .findings,
      ];

      report.findings.push(
        ...siteFindings
      );

      siteResult.coverage =
        siteCoverage(
          siteResult
        );

      report.sites.push(
        siteResult
      );

      report.summary
        .sitesChecked +=
        1;

      report.summary
        .routeChecks +=
        siteResult.routes
          .anonymous.length +
        siteResult.routes
          .authenticated.length +
        siteResult.routes
          .clearedSession.length;
    }
  }
  finally {
    await browser.close();
  }

  report.summary.openFindings =
    report.findings.length;

  for (
    const item
    of report.findings
  ) {
    if (
      Object.hasOwn(
        report.summary,
        item.severity
      )
    ) {
      report.summary[
        item.severity
      ] += 1;
    }
  }

  const anyBlocked =
    report.sites.some(
      site =>
        site.status ===
        'blocked'
    );

  report.coverageStatus =
    'partial';

  report.runStatus =
    anyBlocked
      ? 'partial'
      : 'complete';

  writeJson(
    REPORT_JSON,
    report
  );

  writeJson(
    DASHBOARD_JSON,
    report
  );

  ensureDir(
    REPORT_MD
  );

  fs.writeFileSync(
    REPORT_MD,
    renderMarkdown(
      report
    ),
    'utf8'
  );

  console.log('');
  console.log(
    'QA SENTINEL TYRA — AUTH/AUTHZ SECURITY'
  );
  console.log(
    '======================================='
  );

  console.log(
    `Run status: ${report.runStatus}`
  );

  console.log(
    `Coverage status: ${report.coverageStatus}`
  );

  console.log(
    `Sites checked: ${report.summary.sitesChecked}/${report.summary.sitesConfigured}`
  );

  console.log(
    `Route checks: ${report.summary.routeChecks}`
  );

  console.log(
    `Open findings: ${report.summary.openFindings}`
  );

  console.log(
    `High: ${report.summary.high}`
  );

  console.log(
    `Medium: ${report.summary.medium}`
  );

  console.log('');

  console.log(
    `JSON: ${path.relative(ROOT, REPORT_JSON)}`
  );

  console.log(
    `Markdown: ${path.relative(ROOT, REPORT_MD)}`
  );

  console.log('');

  console.log(
    'Cross-user, role, object/IDOR, protected API authorization, and server-side logout invalidation remain NOT VERIFIED until explicitly configured.'
  );
}

main().catch(
  error => {
    console.error(
      error instanceof Error
        ? error.stack ||
          error.message
        : String(error)
    );

    process.exitCode =
      1;
  }
);
