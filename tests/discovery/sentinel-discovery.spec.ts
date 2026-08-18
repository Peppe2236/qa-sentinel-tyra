import fs from 'node:fs';
import path from 'node:path';

import {
  test,
  expect,
  type Page,
  type Request,
  type Response,
} from '@playwright/test';

import {
  SENTINEL_SITES,
  type SentinelSite,
} from '../../config/sites';

import {
  buildDiscoveryReport,
  type SentinelDiscoveryObservation,
  type SentinelFailedRequest,
  type SentinelHttpError,
} from '../../reporters/analyzers/sentinel-discovery';

import type {
  ApiBackendEvidence,
} from '../../reporters/models/types';


/* =========================================================
   CONFIGURATION
   ========================================================= */

const MAX_ROUTES_PER_SITE = 50;

const NAVIGATION_TIMEOUT_MS = 30_000;

const PAGE_SETTLE_TIME_MS = 750;


/* =========================================================
   URL HELPERS
   ========================================================= */

function normalizeUrl(
  value: string,
  baseUrl: string
): string | null {
  try {
    const url =
      new URL(
        value,
        baseUrl
      );

    url.hash = '';

    return url.toString();
  } catch {
    return null;
  }
}


function isHttpUrl(
  value: string
): boolean {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://')
  );
}


function isSameOrigin(
  value: string,
  baseUrl: string
): boolean {
  try {
    return (
      new URL(value).origin ===
      new URL(baseUrl).origin
    );
  } catch {
    return false;
  }
}


function routeFromUrl(
  value: string
): string {
  try {
    const url =
      new URL(value);

    return (
      url.pathname +
      url.search
    );
  } catch {
    return value;
  }
}


function safeEvidenceUrl(
  value: string
): string | null {
  try {
    const url =
      new URL(value);

    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';

    return url.toString();
  } catch {
    return null;
  }
}


function positiveEvidenceFromResponse(
  response: Response,
  site: SentinelSite
): ApiBackendEvidence | null {
  const statusCode =
    response.status();

  if (
    statusCode < 200 ||
    statusCode >= 400
  ) {
    return null;
  }

  const request =
    response.request();

  const resourceType =
    request.resourceType();

  if (
    resourceType !== 'document' &&
    resourceType !== 'fetch' &&
    resourceType !== 'xhr'
  ) {
    return null;
  }

  if (
    !isSameOrigin(
      response.url(),
      site.baseURL
    )
  ) {
    return null;
  }

  const url =
    safeEvidenceUrl(
      response.url()
    );

  if (!url) {
    return null;
  }

  const kind:
    ApiBackendEvidence['kind'] =
      resourceType === 'document'
        ? 'backend-service'
        : 'api-endpoint';

  return {
    kind,
    site:
      site.id,
    url,
    service:
      kind === 'backend-service'
        ? new URL(url).origin
        : undefined,
    method:
      request.method(),
    statusCode,
    resourceType,
    originSource:
      'discovery',
    observedAt:
      new Date().toISOString(),
  };
}


/* =========================================================
   PAGE COLLECTION
   ========================================================= */

async function collectPageObservation(
  page: Page,
  site: SentinelSite,
  targetUrl: string
): Promise<SentinelDiscoveryObservation> {
  const consoleErrors: string[] = [];

  const pageErrors: string[] = [];

  const failedRequests:
    SentinelFailedRequest[] = [];

  const httpErrors:
    SentinelHttpError[] = [];

  const apiBackendEvidence:
    ApiBackendEvidence[] = [];


  /* -------------------------------------------------------
     Runtime listeners
     ------------------------------------------------------- */

  const consoleHandler = (
    message: {
      type(): string;
      text(): string;
    }
  ) => {
    if (
      message.type() ===
      'error'
    ) {
      consoleErrors.push(
        message.text()
      );
    }
  };


  const pageErrorHandler = (
    error: Error
  ) => {
    pageErrors.push(
      error.stack ??
      error.message
    );
  };


  const requestFailedHandler = (
    request: Request
  ) => {
    failedRequests.push({
      url:
        request.url(),

      method:
        request.method(),

      resourceType:
        request.resourceType(),

      failure:
        request.failure()?.errorText,
    });
  };


  const responseHandler = (
    response: Response
  ) => {
    const positiveEvidence =
      positiveEvidenceFromResponse(
        response,
        site
      );

    if (positiveEvidence) {
      apiBackendEvidence.push(
        positiveEvidence
      );
    }

    const status =
      response.status();

    if (status < 400) {
      return;
    }

    const request =
      response.request();

    httpErrors.push({
      url:
        response.url(),

      status,

      method:
        request.method(),

      resourceType:
        request.resourceType(),
    });
  };


  page.on(
    'console',
    consoleHandler
  );

  page.on(
    'pageerror',
    pageErrorHandler
  );

  page.on(
    'requestfailed',
    requestFailedHandler
  );

  page.on(
    'response',
    responseHandler
  );


  /* -------------------------------------------------------
     Navigation
     ------------------------------------------------------- */

  try {
    await page.goto(
      targetUrl,
      {
        waitUntil:
          'domcontentloaded',

        timeout:
          NAVIGATION_TIMEOUT_MS,
      }
    );

    await page.waitForTimeout(
      PAGE_SETTLE_TIME_MS
    );
  } catch (error) {
    pageErrors.push(
      error instanceof Error
        ? error.message
        : String(error)
    );
  }


  /* -------------------------------------------------------
     DOM inventory
     ------------------------------------------------------- */

  const title =
    await page
      .title()
      .catch(
        () => ''
      );


  const links =
    await page
      .locator('a[href]')
      .evaluateAll(
        (
          elements:
            HTMLAnchorElement[]
        ) =>
          elements
            .map(
              element =>
                element.href
            )
            .filter(Boolean)
      )
      .catch(
        () => []
      );


  const buttons =
    await page
      .locator(
        [
          'button',
          '[role="button"]',
          'input[type="button"]',
          'input[type="submit"]',
        ].join(',')
      )
      .evaluateAll(
        (
          elements:
            HTMLElement[]
        ) =>
          elements.map(
            (
              element,
              index
            ) => {
              const text =
                (
                  element.innerText ??
                  element.getAttribute(
                    'aria-label'
                  ) ??
                  element.getAttribute(
                    'title'
                  ) ??
                  ''
                )
                  .trim();

              return (
                text ||
                `button-${index + 1}`
              );
            }
          )
      )
      .catch(
        () => []
      );


  const forms =
    await page
      .locator('form')
      .count()
      .catch(
        () => 0
      );


  const inputs =
    await page
      .locator(
        'input, textarea, select'
      )
      .count()
      .catch(
        () => 0
      );


  const images =
    await page
      .locator('img')
      .count()
      .catch(
        () => 0
      );


  const scripts =
    await page
      .locator('script')
      .count()
      .catch(
        () => 0
      );


  /* -------------------------------------------------------
     Cleanup listeners
     ------------------------------------------------------- */

  page.off(
    'console',
    consoleHandler
  );

  page.off(
    'pageerror',
    pageErrorHandler
  );

  page.off(
    'requestfailed',
    requestFailedHandler
  );

  page.off(
    'response',
    responseHandler
  );


  return {
    site:
      site.id,

    url:
      page.url() ||
      targetUrl,

    route:
      routeFromUrl(
        page.url() ||
        targetUrl
      ),

    title,

    links,

    buttons,

    forms,

    inputs,

    images,

    scripts,

    consoleErrors,

    pageErrors,

    failedRequests,

    httpErrors,

    apiBackendEvidence,

    discoveredAt:
      new Date().toISOString(),
  };
}


/* =========================================================
   SITE CRAWLER
   ========================================================= */

async function crawlSite(
  page: Page,
  site: SentinelSite
): Promise<
  SentinelDiscoveryObservation[]
> {
  const observations:
    SentinelDiscoveryObservation[] = [];

  const queue: string[] = [];

  const visited =
    new Set<string>();


  const startUrl =
    normalizeUrl(
      site.baseURL,
      site.baseURL
    );

  if (!startUrl) {
    throw new Error(
      `Invalid baseURL for site: ${site.id}`
    );
  }

  queue.push(
    startUrl
  );


  while (
    queue.length > 0 &&
    visited.size <
      MAX_ROUTES_PER_SITE
  ) {
    const nextUrl =
      queue.shift();

    if (!nextUrl) {
      continue;
    }

    if (
      visited.has(
        nextUrl
      )
    ) {
      continue;
    }

    visited.add(
      nextUrl
    );


    console.log(
      `[Sentinel Discovery] ${site.id}: ${nextUrl}`
    );


    const observation =
      await collectPageObservation(
        page,
        site,
        nextUrl
      );

    observations.push(
      observation
    );


    /* -----------------------------------------------------
       Discover new internal routes
       ----------------------------------------------------- */

    for (
      const rawLink of
      observation.links ?? []
    ) {
      const normalized =
        normalizeUrl(
          rawLink,
          site.baseURL
        );

      if (!normalized) {
        continue;
      }

      if (
        !isHttpUrl(
          normalized
        )
      ) {
        continue;
      }

      if (
        !isSameOrigin(
          normalized,
          site.baseURL
        )
      ) {
        continue;
      }

      if (
        visited.has(
          normalized
        )
      ) {
        continue;
      }

      if (
        queue.includes(
          normalized
        )
      ) {
        continue;
      }

      queue.push(
        normalized
      );
    }
  }


  return observations;
}


/* =========================================================
   PLAYWRIGHT TESTS
   ========================================================= */

test.describe(
  'QA Sentinel Tyra - Deep Discovery',
  () => {

    test(
      'discover configured site',
      {
        annotation: [
          {
            type: 'requirement',
            description: 'REQ-PLATFORM-DISCOVERY-001',
          },
          {
            type: 'acceptance-criterion',
            description: 'AC-PLATFORM-DISCOVERY-001-CRAWL',
          },
          {
            type: 'critical-flow',
            description: 'FLOW-PLATFORM-DISCOVERY',
          },
          {
            type: 'flow-scenario',
            description: 'SCN-PLATFORM-DISCOVERY-CRAWL',
          },
          {
            type: 'category',
            description: 'availability',
          },
        ],
      },
      async (
        {
          page,
        },
        testInfo
      ) => {

        const projectName =
          testInfo.project.name;

        const siteId =
          projectName.startsWith(
            'ai-skills-'
          )
            ? 'ai-skills'
            : projectName.startsWith(
                'nation-'
              )
              ? 'nation'
              : null;

        expect(
          siteId,
          `Could not determine site from project "${projectName}".`
        ).not.toBeNull();

        const site =
          SENTINEL_SITES.find(
            candidate =>
              candidate.id === siteId
          );

        expect(
          site,
          `No Sentinel site configuration found for "${siteId}".`
        ).toBeDefined();

        if (!site) {
          return;
        }

        const observations =
          await crawlSite(
            page,
            site
          );

        const report =
          buildDiscoveryReport(
            observations
          );

        const apiBackendEvidence =
          [
            ...new Map(
              observations
                .flatMap(
                  observation =>
                    observation
                      .apiBackendEvidence ??
                    []
                )
                .map(
                  evidence => [
                    [
                      evidence.kind,
                      evidence.site,
                      evidence.method,
                      evidence.url,
                      evidence.statusCode,
                    ].join('|'),
                    evidence,
                  ] as const
                )
            ).values(),
          ];

        const outputReport = {
          ...report,
          apiBackendEvidence,
        };

          const discoveryDirectory =
  path.join(
    process.cwd(),
    'reports',
    'discovery'
  );

fs.mkdirSync(
  discoveryDirectory,
  {
    recursive: true,
  }
);

const discoveryFile =
  path.join(
    discoveryDirectory,
    `${site.id}.json`
  );

fs.writeFileSync(
  discoveryFile,
  JSON.stringify(
    outputReport,
    null,
    2
  ),
  'utf8'
);

console.log(
  `[Sentinel Discovery] Report saved: ${discoveryFile}`
);

        const siteReport =
          report.sites[
            site.id
          ];

        console.log(
          '\n' +
          '==================================================\n' +
          ` SENTINEL DISCOVERY: ${site.name}\n` +
          '=================================================='
        );

        console.log(
          `Project: ${projectName}`
        );

        console.log(
          `Routes discovered: ${
            siteReport?.routes.length ??
            0
          }`
        );

        console.log(
          `Internal links: ${
            siteReport
              ?.internalLinks
              .length ??
            0
          }`
        );

        console.log(
          `External links: ${
            siteReport
              ?.externalLinks
              .length ??
            0
          }`
        );

        console.log(
          `Buttons observed: ${
            siteReport?.buttons ??
            0
          }`
        );

        console.log(
          `Forms observed: ${
            siteReport?.forms ??
            0
          }`
        );

        console.log(
          `Inputs observed: ${
            siteReport?.inputs ??
            0
          }`
        );

        console.log(
          `Console errors: ${
            siteReport
              ?.consoleErrors ??
            0
          }`
        );

        console.log(
          `Page errors: ${
            siteReport
              ?.pageErrors ??
            0
          }`
        );

        console.log(
          `Failed requests: ${
            siteReport
              ?.failedRequests ??
            0
          }`
        );

        console.log(
          `HTTP errors: ${
            siteReport
              ?.httpErrors ??
            0
          }`
        );

        console.log(
          `Findings: ${
            siteReport
              ?.findings.length ??
            0
          }`
        );

        console.log(
          '==================================================\n'
        );

        expect(
          observations.length
        ).toBeGreaterThan(
          0
        );
      }
    );
  }
);