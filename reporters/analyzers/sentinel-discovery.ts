/**
 * QA Sentinel Tyra
 * Sentinel Discovery Analyzer
 *
 * Normalizes discovery data collected by Playwright and
 * produces a structured per-site inventory of routes,
 * links, interactive elements, runtime failures and
 * network failures.
 *
 * This analyzer does not crawl the application itself.
 * Crawling is performed by Playwright. This module takes
 * the collected observations and turns them into data that
 * Sentinel can analyze, prioritize and display.
 */

import {
  buildDiagnosis,
} from './sentinel-diagnostics';

import type {
  ApiBackendEvidence,
} from '../models/types';

export type DiscoverySeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export type DiscoveryCategory =
  | 'route'
  | 'network'
  | 'runtime'
  | 'link'
  | 'form'
  | 'interaction'
  | 'asset'
  | 'content'
  | 'accessibility'
  | 'performance'
  | 'security';

export interface SentinelDiscoveryObservation {
  site: string;
  url: string;

  route?: string;

  title?: string;

  discoveredFrom?: string;

  links?: string[];

  buttons?: string[];

  forms?: number;

  inputs?: number;

  images?: number;

  scripts?: number;

  consoleErrors?: string[];

  pageErrors?: string[];

  failedRequests?: SentinelFailedRequest[];

  httpErrors?: SentinelHttpError[];

  apiBackendEvidence?:
    ApiBackendEvidence[];

  discoveredAt?: string;
}

export interface SentinelFailedRequest {
  url: string;

  method?: string;

  resourceType?: string;

  failure?: string;
}

export interface SentinelHttpError {
  url: string;

  status: number;

  method?: string;

  resourceType?: string;
}

export interface SentinelDiscoveryFinding {
  id: string;

  site: string;

  route: string;

  url: string;

  category: DiscoveryCategory;

  severity: DiscoverySeverity;

  title: string;

  description: string;

  evidence?: string;

  userImpact: string;

  recommendation: string;

  diagnosisStatus:
  | 'confirmed'
  | 'likely'
  | 'needs-investigation';

rootCause: string;

diagnosisConfidence: number;

releaseImpact:
  | 'blocking'
  | 'warning'
  | 'non-blocking'
  | 'informational';

verificationSteps: string[];

expectedResolution: string;

  priorityScore: number;
  priority:
  | 'P0'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4';

occurrences: number;

affectedRoutes: string[];

fingerprint: string;

discoveredAt: string;

}

export interface SentinelSiteDiscovery {
  site: string;

  routes: string[];

  internalLinks: string[];

  externalLinks: string[];

  buttons: number;

  forms: number;

  inputs: number;

  images: number;

  scripts: number;

  consoleErrors: number;

  pageErrors: number;

  failedRequests: number;

  httpErrors: number;

  findings: SentinelDiscoveryFinding[];
}

export interface SentinelDiscoveryReport {
  generatedAt: string;

  sites: Record<
    string,
    SentinelSiteDiscovery
  >;

  totals: {
    sites: number;

    routes: number;

    internalLinks: number;

    externalLinks: number;

    buttons: number;

    forms: number;

    inputs: number;

    images: number;

    scripts: number;

    consoleErrors: number;

    pageErrors: number;

    failedRequests: number;

    httpErrors: number;

    findings: number;
  };

  prioritizedFindings:
    SentinelDiscoveryFinding[];
}


/* =========================================================
   HELPERS
   ========================================================= */

function unique(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}


function safeUrl(
  value: string
): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}


function routeFromUrl(
  value: string
): string {
  const parsed =
    safeUrl(value);

  if (!parsed) {
    return value;
  }

  return (
    parsed.pathname +
    parsed.search
  );
}


function isInternalLink(
  link: string,
  pageUrl: string
): boolean {
  const parsedLink =
    safeUrl(link);

  const parsedPage =
    safeUrl(pageUrl);

  if (
    !parsedLink ||
    !parsedPage
  ) {
    return false;
  }

  return (
    parsedLink.origin ===
    parsedPage.origin
  );
}


function hashString(
  value: string
): string {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      (
        (hash << 5) -
        hash +
        value.charCodeAt(index)
      ) | 0;
  }

  return Math.abs(hash)
    .toString(16)
    .padStart(8, '0');
}


function findingId(
  finding: {
    site: string;
    route: string;
    category: string;
    title: string;
  }
): string {
  return hashString(
    [
      finding.site,
      finding.route,
      finding.category,
      finding.title,
    ].join('|')
  );
}


/* =========================================================
   PRIORITY
   ========================================================= */

function severityWeight(
  severity: DiscoverySeverity
): number {
  switch (severity) {
    case 'critical':
      return 100;

    case 'high':
      return 80;

    case 'medium':
      return 55;

    case 'low':
      return 30;

    case 'info':
    default:
      return 10;
  }
}


function categoryWeight(
  category: DiscoveryCategory
): number {
  switch (category) {
    case 'security':
      return 30;

    case 'runtime':
      return 25;

    case 'network':
      return 22;

    case 'route':
      return 20;

    case 'interaction':
      return 18;

    case 'form':
      return 17;

    case 'accessibility':
      return 15;

    case 'performance':
      return 12;

    case 'asset':
      return 10;

    case 'link':
      return 8;

    case 'content':
      return 6;

    default:
      return 0;
  }
}

function criticalRouteWeight(
  routes: string[]
): number {
  const criticalRoutes = [
    '/signin',
    '/signup',
    '/profile',
    '/assessment',
    '/path',
    '/skills',
    '/practice',
  ];

  const importantRoutes = [
    '/',
    '/home',
    '/jobs',
    '/benchmarks',
    '/forgot-password',
  ];

  let weight = 0;

  for (const route of routes) {
    if (
      criticalRoutes.some(
        critical =>
          route === critical ||
          route.startsWith(
            `${critical}/`
          )
      )
    ) {
      weight += 3;
      continue;
    }

    if (
      importantRoutes.includes(
        route
      )
    ) {
      weight += 1;
    }
  }

  return Math.min(
    15,
    weight
  );
}

function calculatePriorityScore(
  severity: DiscoverySeverity,
  category: DiscoveryCategory,
  affectedRoutes: string[] = []
): number {
  const baseScore =
    severityWeight(severity) +
    categoryWeight(category);

  const routeCount =
    Math.max(
      1,
      affectedRoutes.length
    );

  const scopeBonus =
    Math.min(
      15,
      Math.max(
        0,
        routeCount - 1
      )
    );

  const criticalityBonus =
    criticalRouteWeight(
      affectedRoutes
    );

  return (
    baseScore +
    scopeBonus +
    criticalityBonus
  );
}

function priorityFromScore(
  score: number,
  severity: DiscoverySeverity
):
  | 'P0'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4' {
  let priority:
    | 'P0'
    | 'P1'
    | 'P2'
    | 'P3'
    | 'P4';

  if (score >= 120) {
    priority = 'P0';
  } else if (score >= 95) {
    priority = 'P1';
  } else if (score >= 70) {
    priority = 'P2';
  } else if (score >= 45) {
    priority = 'P3';
  } else {
    priority = 'P4';
  }

  /*
   * Guardrails:
   *
   * Scope and route criticality may increase the score,
   * but they must not turn a low-severity observation
   * into a release-level issue by themselves.
   */

  if (
    severity === 'low' &&
    ['P0', 'P1', 'P2'].includes(priority)
  ) {
    return 'P3';
  }

  if (
    severity === 'info'
  ) {
    return 'P4';
  }

  if (
    severity === 'medium' &&
    ['P0', 'P1'].includes(priority)
  ) {
    return 'P2';
  }

  return priority;
}

/* =========================================================
   FINDING FACTORY
   ========================================================= */

function createFinding(
  data: {
    site: string;

    url: string;

    route: string;

    category: DiscoveryCategory;

    severity: DiscoverySeverity;

    title: string;

    description: string;

    evidence?: string;

    userImpact: string;

    recommendation: string;

    discoveredAt?: string;
  }
): SentinelDiscoveryFinding {
  const finding = {
    site: data.site,

    route: data.route,

    category: data.category,

    title: data.title,
  };
const priorityScore =
  calculatePriorityScore(
    data.severity,
    data.category,
    [data.route]
  );

const fingerprint =
  hashString(
    [
      data.site,
      data.category,
      data.title,
    ].join('|')
  );

  const diagnosis =
  buildDiagnosis({
    category:
      data.category,

    severity:
      data.severity,

    title:
      data.title,

    evidence:
      data.evidence,
  });

  return {
    id:
      findingId(
        finding
      ),

    site:
      data.site,

    route:
      data.route,

    url:
      data.url,

    category:
      data.category,

    severity:
      data.severity,

    title:
      data.title,

    description:
      data.description,

    evidence:
      data.evidence,

    userImpact:
      data.userImpact,

    recommendation:
      data.recommendation,

      diagnosisStatus:
  diagnosis.diagnosisStatus,

rootCause:
  diagnosis.rootCause,

diagnosisConfidence:
  diagnosis.diagnosisConfidence,

releaseImpact:
  diagnosis.releaseImpact,

verificationSteps:
  diagnosis.verificationSteps,

expectedResolution:
  diagnosis.expectedResolution,

   priorityScore,

priority:
  priorityFromScore(
    priorityScore,
    data.severity
  ),

occurrences: 1,

affectedRoutes: [
  data.route,
],

fingerprint,

    discoveredAt:
      data.discoveredAt ??
      new Date().toISOString(),
  };
}


/* =========================================================
   HTTP CLASSIFICATION
   ========================================================= */

function classifyHttpStatus(
  status: number
): DiscoverySeverity {
  if (status >= 500) {
    return 'high';
  }

  if (
    status === 401 ||
    status === 403
  ) {
    return 'medium';
  }

  if (status === 404) {
    return 'medium';
  }

  if (status >= 400) {
    return 'low';
  }

  return 'info';
}


function httpRecommendation(
  status: number
): string {
  if (status >= 500) {
    return (
      'Investigate the failing server or API endpoint ' +
      'before release and verify the affected user flow.'
    );
  }

  if (status === 404) {
    return (
      'Verify the requested resource or route and correct ' +
      'the broken reference, asset or endpoint.'
    );
  }

  if (
    status === 401 ||
    status === 403
  ) {
    return (
      'Verify whether authentication or authorization is ' +
      'expected for this request and confirm the user flow.'
    );
  }

  return (
    'Review the failed HTTP request and determine whether ' +
    'the response is expected.'
  );
}

/* =========================================================
   DISCOVERY SIGNAL FILTERING
   ========================================================= */

   function isExpectedAbortedRequest(
  request: SentinelFailedRequest
): boolean {
  const failure =
    request.failure?.toLowerCase() ??
    '';

  if (
    !failure.includes(
      'err_aborted'
    )
  ) {
    return false;
  }

  const parsed =
    safeUrl(
      request.url
    );

  if (!parsed) {
    return false;
  }

  /*
   * Next.js React Server Component requests may
   * legitimately be cancelled during navigation
   * or prefetch changes.
   */
  if (
    parsed.searchParams.has(
      '_rsc'
    )
  ) {
    return true;
  }

  /*
   * Media requests can be aborted when Sentinel
   * moves away from the page before the browser
   * has finished buffering the resource.
   *
   * ERR_ABORTED alone does not prove that the
   * video or media asset is broken.
   */
  if (
    request.resourceType ===
    'media'
  ) {
    return true;
  }

  return false;
}


function isTelemetryCspFailure(
  request: SentinelFailedRequest
): boolean {
  const failure =
    request.failure?.toLowerCase() ??
    '';

  if (
    failure !== 'csp'
  ) {
    return false;
  }

  const parsed =
    safeUrl(
      request.url
    );

  if (!parsed) {
    return false;
  }

  const hostname =
    parsed.hostname.toLowerCase();

  return (
    hostname ===
      'scripts.clarity.ms' ||
    hostname.endsWith(
      '.clarity.ms'
    ) ||
    hostname ===
      'www.google-analytics.com' ||
    hostname.endsWith(
      '.google-analytics.com'
    ) ||
    hostname ===
      'www.googletagmanager.com' ||
    hostname.endsWith(
      '.googletagmanager.com'
    )
  );
}
function isAnalyticsCspViolation(
  error: string
): boolean {
  const normalized =
    error.toLowerCase();

  return (
    normalized.includes(
      'content security policy'
    ) &&
    (
      normalized.includes(
        'google-analytics.com'
      ) ||
      normalized.includes(
        'googletagmanager.com'
      ) ||
      normalized.includes(
        'clarity.ms'
      )
    )
  );
}


function classifyConsoleError(
  error: string
): {
  severity: DiscoverySeverity;
  category: DiscoveryCategory;
  title: string;
  userImpact: string;
  recommendation: string;
} {
  if (
    isAnalyticsCspViolation(
      error
    )
  ) {
    return {
      severity:
        'low',

      category:
        'security',

      title:
        'Analytics request blocked by Content Security Policy',

      userImpact:
        'Primary site functionality may continue working, but analytics or telemetry data can be incomplete.',

      recommendation:
        'Review the Content Security Policy and align the allowed analytics domains with the endpoints actually used by the application.',
    };
  }

  return {
    severity:
      'high',

    category:
      'runtime',

    title:
      'Browser console error detected',

    userImpact:
      'A frontend runtime problem may cause visible or hidden application failures.',

    recommendation:
      'Investigate the console error, reproduce the affected flow and correct the underlying frontend failure.',
  };
}
/* =========================================================
   OBSERVATION ANALYSIS
   ========================================================= */

function analyzeObservation(
  observation:
    SentinelDiscoveryObservation
): SentinelDiscoveryFinding[] {
  const findings:
    SentinelDiscoveryFinding[] = [];

  const route =
    observation.route ??
    routeFromUrl(
      observation.url
    );

  const discoveredAt =
    observation.discoveredAt ??
    new Date().toISOString();


  /* -------------------------------------------------------
     Console errors
     ------------------------------------------------------- */

 for (
  const error of
  observation.consoleErrors ?? []
) {
  const classification =
    classifyConsoleError(
      error
    );

  findings.push(
    createFinding({
      site:
        observation.site,

      url:
        observation.url,

      route,

      category:
        classification.category,

      severity:
        classification.severity,

      title:
        classification.title,

      description:
        isAnalyticsCspViolation(
          error
        )
          ? 'An analytics endpoint was blocked by the active Content Security Policy.'
          : 'The page emitted an error in the browser console.',

      evidence:
        error,

      userImpact:
        classification.userImpact,

      recommendation:
        classification.recommendation,

      discoveredAt,
    })
  );
}


  /* -------------------------------------------------------
     Uncaught page errors
     ------------------------------------------------------- */

  for (
    const error of
    observation.pageErrors ?? []
  ) {
    findings.push(
      createFinding({
        site:
          observation.site,

        url:
          observation.url,

        route,

        category:
          'runtime',

        severity:
          'critical',

        title:
          'Uncaught page exception detected',

        description:
          'An uncaught JavaScript exception occurred while the page was running.',

        evidence:
          error,

        userImpact:
          'The affected page or user flow may stop functioning correctly.',

        recommendation:
          'Treat the exception as a release-priority defect and investigate the stack trace and triggering interaction.',

        discoveredAt,
      })
    );
  }


  /* -------------------------------------------------------
     Failed requests
     ------------------------------------------------------- */

 for (
  const request of
  observation.failedRequests ?? []
) {
  if (
    isExpectedAbortedRequest(
      request
    )
  ) {
    continue;
  }

  if (
    isTelemetryCspFailure(
      request
    )
  ) {
    findings.push(
      createFinding({
        site:
          observation.site,

        url:
          observation.url,

        route,

        category:
          'security',

        severity:
          'low',

        title:
          'Telemetry resource blocked by Content Security Policy',

        description:
          'A third-party telemetry resource was blocked by the active Content Security Policy.',

        evidence:
          [
            request.url,
            request.failure,
          ]
            .filter(Boolean)
            .join(' — '),

        userImpact:
          'Primary functionality may continue working, but telemetry or analytics coverage can be incomplete.',

        recommendation:
          'Review the Content Security Policy and either explicitly allow the intended telemetry resource or remove the unused integration.',

        discoveredAt,
      })
    );

    continue;
  }

  findings.push(
    createFinding({
      site:
        observation.site,

      url:
        observation.url,

      route,

      category:
        'network',

      severity:
        'high',

      title:
        'Network request failed',

      description:
        `${request.method ?? 'GET'} request failed.`,

      evidence:
        [
          request.url,
          request.failure,
        ]
          .filter(Boolean)
          .join(' — '),

      userImpact:
        'Content or functionality depending on this request may be unavailable.',

      recommendation:
        'Inspect the request failure, endpoint availability, CORS configuration and client-side error handling.',

      discoveredAt,
    })
  );
}


  /* -------------------------------------------------------
     HTTP errors
     ------------------------------------------------------- */

  for (
    const error of
    observation.httpErrors ?? []
  ) {
    findings.push(
      createFinding({
        site:
          observation.site,

        url:
          observation.url,

        route,

        category:
          error.resourceType ===
          'image'
            ? 'asset'
            : 'network',

        severity:
          classifyHttpStatus(
            error.status
          ),

        title:
          `HTTP ${error.status} response detected`,

        description:
          `${error.method ?? 'GET'} request returned HTTP ${error.status}.`,

        evidence:
          error.url,

        userImpact:
          error.status >= 500
            ? 'A server-side failure may prevent users from completing the affected flow.'
            : 'A requested resource or function may not be available as expected.',

        recommendation:
          httpRecommendation(
            error.status
          ),

        discoveredAt,
      })
    );
  }

  return findings;
}


/* =========================================================
   SITE BUILD
   ========================================================= */

function createEmptySite(
  site: string
): SentinelSiteDiscovery {
  return {
    site,

    routes: [],

    internalLinks: [],

    externalLinks: [],

    buttons: 0,

    forms: 0,

    inputs: 0,

    images: 0,

    scripts: 0,

    consoleErrors: 0,

    pageErrors: 0,

    failedRequests: 0,

    httpErrors: 0,

    findings: [],
  };
}


function addObservationToSite(
  site:
    SentinelSiteDiscovery,

  observation:
    SentinelDiscoveryObservation
): void {
  const route =
    observation.route ??
    routeFromUrl(
      observation.url
    );

  site.routes.push(
    route
  );

  for (
    const link of
    observation.links ?? []
  ) {
    if (
      isInternalLink(
        link,
        observation.url
      )
    ) {
      site.internalLinks.push(
        link
      );
    } else {
      site.externalLinks.push(
        link
      );
    }
  }

  site.buttons +=
    observation.buttons?.length ??
    0;

  site.forms +=
    observation.forms ??
    0;

  site.inputs +=
    observation.inputs ??
    0;

  site.images +=
    observation.images ??
    0;

  site.scripts +=
    observation.scripts ??
    0;

  site.consoleErrors +=
    observation.consoleErrors?.length ??
    0;

  site.pageErrors +=
    observation.pageErrors?.length ??
    0;

  site.failedRequests +=
    observation.failedRequests?.length ??
    0;

  site.httpErrors +=
    observation.httpErrors?.length ??
    0;

  site.findings.push(
    ...analyzeObservation(
      observation
    )
  );
}


/* =========================================================
   MAIN ANALYZER
   ========================================================= */

export function buildDiscoveryReport(
  observations:
    SentinelDiscoveryObservation[]
): SentinelDiscoveryReport {
  const sites:
    Record<
      string,
      SentinelSiteDiscovery
    > = {};

  for (
    const observation of
    observations
  ) {
    if (
      !sites[
        observation.site
      ]
    ) {
      sites[
        observation.site
      ] =
        createEmptySite(
          observation.site
        );
    }

    addObservationToSite(
      sites[
        observation.site
      ],
      observation
    );
  }


  /* -------------------------------------------------------
     Deduplicate site data
     ------------------------------------------------------- */

  for (
    const site of
    Object.values(sites)
  ) {
    site.routes =
      unique(
        site.routes
      );

    site.internalLinks =
      unique(
        site.internalLinks
      );

    site.externalLinks =
      unique(
        site.externalLinks
      );

    const findingMap =
  new Map<
    string,
    SentinelDiscoveryFinding
  >();

for (
  const finding of
  site.findings
) {
  const key =
    finding.fingerprint;

  const existing =
    findingMap.get(key);

  if (!existing) {
    findingMap.set(
      key,
      {
        ...finding,

        occurrences:
          finding.occurrences ?? 1,

        affectedRoutes:
          unique([
            ...(finding.affectedRoutes ?? []),
            finding.route,
          ]),
      }
    );

    continue;
  }

  existing.occurrences +=
    finding.occurrences ?? 1;

  existing.affectedRoutes =
    unique([
      ...existing.affectedRoutes,
      ...(finding.affectedRoutes ?? []),
      finding.route,
    ]);

existing.priorityScore =
  calculatePriorityScore(
    existing.severity,
    existing.category,
    existing.affectedRoutes
  );

existing.priority =
  priorityFromScore(
    existing.priorityScore,
    existing.severity
  );
}

site.findings =
  [
    ...findingMap.values(),
  ].sort(
    (a, b) =>
      b.priorityScore -
      a.priorityScore
  );
  }
  /* -------------------------------------------------------
     Global prioritized findings
     ------------------------------------------------------- */

  const prioritizedFindings =
    Object.values(sites)
      .flatMap(
        site =>
          site.findings
      )
      .sort(
        (a, b) =>
          b.priorityScore -
          a.priorityScore
      );


  /* -------------------------------------------------------
     Totals
     ------------------------------------------------------- */

  const totals = {
    sites:
      Object.keys(
        sites
      ).length,

    routes: 0,

    internalLinks: 0,

    externalLinks: 0,

    buttons: 0,

    forms: 0,

    inputs: 0,

    images: 0,

    scripts: 0,

    consoleErrors: 0,

    pageErrors: 0,

    failedRequests: 0,

    httpErrors: 0,

    findings:
      prioritizedFindings.length,
  };

  for (
    const site of
    Object.values(sites)
  ) {
    totals.routes +=
      site.routes.length;

    totals.internalLinks +=
      site.internalLinks.length;

    totals.externalLinks +=
      site.externalLinks.length;

    totals.buttons +=
      site.buttons;

    totals.forms +=
      site.forms;

    totals.inputs +=
      site.inputs;

    totals.images +=
      site.images;

    totals.scripts +=
      site.scripts;

    totals.consoleErrors +=
      site.consoleErrors;

    totals.pageErrors +=
      site.pageErrors;

    totals.failedRequests +=
      site.failedRequests;

    totals.httpErrors +=
      site.httpErrors;
  }

  return {
    generatedAt:
      new Date().toISOString(),

    sites,

    totals,

    prioritizedFindings,
  };
}