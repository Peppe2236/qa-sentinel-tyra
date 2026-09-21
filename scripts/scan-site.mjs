import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const startUrl =
  process.argv[2] ??
  process.env.QA_SCAN_URL ??
  'https://nation.dev/';

const requestedSiteId =
  process.argv[3] ??
  process.env.QA_SCAN_SITE;

function siteIdFromUrl(value) {
  const hostname = new URL(value).hostname.toLowerCase();

  if (hostname === 'aiskills.nation.dev') {
    return 'ai-skills';
  }

  if (hostname === 'nation.dev' || hostname === 'www.nation.dev') {
    return 'nation';
  }

  return hostname.replace(/[^a-z0-9]+/g, '-');
}

function normalizeSiteId(value) {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    throw new Error('A safe scan site id could not be determined.');
  }

  return normalized;
}

const siteId = normalizeSiteId(
  requestedSiteId ?? siteIdFromUrl(startUrl)
);

const maxPages = Number(process.env.QA_MAX_PAGES ?? 50);
const navigationTimeout = Number(process.env.QA_NAV_TIMEOUT ?? 30000);

const interactionDiscoveryEnabled =
  process.env.QA_INTERACTION_DISCOVERY !== 'false';

const maxInteractionsPerPage = Number(
  process.env.QA_MAX_INTERACTIONS_PER_PAGE ?? 20
);

const interactionWaitMs = Number(
  process.env.QA_INTERACTION_WAIT_MS ?? 350
);

const scanVariant = String(
  process.env.QA_SCAN_VARIANT ?? 'anonymous'
)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-');

const requestedStorageState =
  process.env.QA_STORAGE_STATE?.trim();

const storageStateFile =
  requestedStorageState
    ? path.resolve(
        process.cwd(),
        requestedStorageState
      )
    : null;

const requestedSeedRoutes = String(
  process.env.QA_SCAN_SEEDS ?? ''
)
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

function storageStateHasData(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  try {
    const state = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );

    return (
      (
        Array.isArray(state.cookies) &&
        state.cookies.length > 0
      ) ||
      (
        Array.isArray(state.origins) &&
        state.origins.length > 0
      )
    );
  } catch {
    return false;
  }
}

const storageStateLoaded =
  storageStateHasData(storageStateFile);

const outputDirectory = path.resolve(process.cwd(), 'dashboard', 'data');
const outputSuffix =
  scanVariant === 'anonymous'
    ? ''
    : `-${scanVariant}`;

const outputFile = path.join(
  outputDirectory,
  `discovered-pages-${siteId}${outputSuffix}.json`
);

const ignoredProtocols = ['mailto:', 'tel:', 'javascript:', 'data:'];

function normalizeUrl(rawUrl, baseUrl, allowedOrigin) {
  try {
    const resolved = new URL(rawUrl, baseUrl);

    if (ignoredProtocols.some(protocol => resolved.href.startsWith(protocol))) {
      return null;
    }

    if (resolved.origin !== allowedOrigin) {
      return null;
    }

    resolved.hash = '';

    for (const key of [...resolved.searchParams.keys()]) {
      if (
        key.startsWith('utm_') ||
        key === 'fbclid' ||
        key === 'gclid' ||
        key === '_rsc'
      ) {
        resolved.searchParams.delete(key);
      }
    }

    if (
      /^\/(?:signin|login)$/i.test(
        resolved.pathname
      )
    ) {
      for (
        const key
        of [
          'callbackUrl',
          'callback',
          'returnTo',
          'redirect',
          'redirectTo',
          'next',
        ]
      ) {
        resolved.searchParams.delete(key);
      }
    }

    if (resolved.pathname !== '/' && resolved.pathname.endsWith('/')) {
      resolved.pathname = resolved.pathname.slice(0, -1);
    }

    return resolved.href;
  } catch {
    return null;
  }
}

function shouldSkip(url) {
  const pathname = new URL(url).pathname.toLowerCase();

  return (
    pathname.startsWith('/api/') ||
    pathname.includes('/logout') ||
    pathname.includes('/signout') ||
    /\.(pdf|zip|jpe?g|png|webp|svg|mp4|webm)$/i.test(pathname)
  );
}

function classifyConsoleMessage(message) {
  const text = message.toLowerCase();

  const isAnalyticsCsp =
    text.includes('content security policy') &&
    (
      text.includes('region1.google-analytics.com') ||
      text.includes('google-analytics.com/g/collect')
    );

  if (isAnalyticsCsp) {
    return {
      severity: 'warning',
      category: 'analytics',
      code: 'GA_CSP_BLOCKED',
      title: 'Google Analytics blocked by CSP',
      message,
      userImpact: false,
    };
  }

  const isClarityCsp =
    text.includes('content security policy') &&
    (
      text.includes('scripts.clarity.ms') ||
      text.includes('clarity.js')
    );

  if (isClarityCsp) {
    return {
      severity: 'warning',
      category: 'analytics',
      code: 'CLARITY_CSP_BLOCKED',
      title: 'Microsoft Clarity blocked by CSP',
      message,
      userImpact: false,
    };
  }

  const isFetchCsp =
    text.includes('fetch api cannot load') &&
    text.includes('content security policy');

  if (isFetchCsp) {
    return {
      severity: 'warning',
      category: 'security-policy',
      code: 'THIRD_PARTY_FETCH_CSP_BLOCKED',
      title: 'Third-party request blocked by CSP',
      message,
      userImpact: false,
    };
  }

  return {
    severity: 'error',
    category: 'javascript',
    code: 'CONSOLE_ERROR',
    title: 'Unexpected browser console error',
    message,
    userImpact: true,
  };
}

function isImageUrl(url) {
  try {
    return /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(
      new URL(url).pathname
    );
  } catch {
    return /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:$|[?#])/i.test(
      String(url)
    );
  }
}

function isMediaUrl(url) {
  try {
    return /\.(mp4|webm|mov|m4v|mkv|mp3|ogg|wav|m3u8)(?:$|[/?#])/i.test(
      new URL(url).pathname
    );
  } catch {
    return /\.(mp4|webm|mov|m4v|mkv|mp3|ogg|wav|m3u8)(?:$|[/?#])/i.test(
      String(url)
    );
  }
}

function isCheckoutConfirm(url) {
  try {
    return new URL(url).pathname.toLowerCase().includes('/checkout/confirm');
  } catch {
    return String(url).toLowerCase().includes('/checkout/confirm');
  }
}


function requestKey(method, url) {
  try {
    const parsed = new URL(url);

    return `${String(method).toUpperCase()} ${parsed.origin}${parsed.pathname}`;
  } catch {
    return `${String(method).toUpperCase()} ${String(url)}`;
  }
}

function isGraphQlRequest(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();

    return (
      pathname === '/api/proxy/graphql' ||
      pathname.endsWith('/graphql')
    );
  } catch {
    return String(url).toLowerCase().includes('/graphql');
  }
}

function classifyFailedRequest(request, successfulRequestKeys = new Set()) {
  const url = request.url;
  const error = String(request.error ?? '').toLowerCase();
  const resourceType =
    String(request.resourceType ?? '').toLowerCase();

  if (
    error === 'csp' &&
    (url.includes('scripts.clarity.ms') || url.includes('clarity.js'))
  ) {
    return {
      severity: 'warning',
      category: 'analytics',
      code: 'CLARITY_REQUEST_CSP_BLOCKED',
      title: 'Microsoft Clarity request blocked by CSP',
      message: `${request.method} ${url} - ${request.error}`,
      userImpact: false,
    };
  }

  if (
    error.includes('err_aborted') &&
    url.includes('_rsc=')
  ) {
    return {
      severity: 'info',
      category: 'framework',
      code: 'NEXT_RSC_ABORTED',
      title: 'Expected Next.js prefetch cancellation',
      message: `${request.method} ${url} - ${request.error}`,
      userImpact: false,
    };
  }



  if (
    error.includes('err_blocked_by_orb') &&
    (
      resourceType === 'image' ||
      isImageUrl(url)
    )
  ) {
    return {
      severity: 'warning',
      category: 'asset',
      code: 'IMAGE_BLOCKED_BY_ORB',
      title: 'Image blocked by browser ORB protection',
      message:
        `${request.method} ${url} - ${request.error}. ` +
        'The image request was blocked by the browser and may result in missing visual content.',
      userImpact: true,
    };
  }

  if (
    error.includes('err_aborted') &&
    isGraphQlRequest(url)
  ) {
    const key = requestKey(request.method, url);
    const recovered = successfulRequestKeys.has(key);

    if (recovered) {
      return {
        severity: 'info',
        category: 'api',
        code: 'GRAPHQL_ABORT_RECOVERED',
        title: 'Aborted GraphQL request recovered during discovery',
        message:
          `${request.method} ${url} - ${request.error}. ` +
          'A successful request to the same GraphQL endpoint was also observed.',
        userImpact: false,
      };
    }

    return {
      severity: 'warning',
      category: 'api',
      code: 'GRAPHQL_ABORTED_DURING_DISCOVERY',
      title: 'GraphQL request aborted during discovery',
      message:
        `${request.method} ${url} - ${request.error}. ` +
        'No successful request to the same endpoint was observed during this page scan. ' +
        'The abort is retained for investigation but is not treated as confirmed user impact.',
      userImpact: false,
    };
  }

  if (
    error.includes('err_aborted') &&
    isMediaUrl(url)
  ) {
    return {
      severity: 'info',
      category: 'asset',
      code: 'MEDIA_ABORTED',
      title: 'Aborted media request during discovery',
      message: `${request.method} ${url} - ${request.error}`,
      userImpact: false,
    };
  }

  if (
    isCheckoutConfirm(url) &&
    (
      error.includes('err_aborted') ||
      error.includes('404')
    )
  ) {
    return {
      severity: 'warning',
      category: 'network',
      code: 'CHECKOUT_CONFIRM_DISCOVERY_NOISE',
      title: '/checkout/confirm request aborted or missing during discovery',
      message: `${request.method} ${url} - ${request.error}`,
      userImpact: false,
    };
  }

  return {
    severity: 'error',
    category: 'network',
    code: 'FAILED_REQUEST',
    title: 'Unexpected failed network request',
    message: `${request.method} ${url} - ${request.error}`,
    userImpact: true,
  };
}

function classifyHttpError(error) {
  const severity = error.status >= 500 ? 'critical' : 'error';

  return {
    severity,
    category: 'http',
    code: `HTTP_${error.status}`,
    title: `HTTP ${error.status} response`,
    message: `${error.status} ${error.method} ${error.url}`,
    userImpact: true,
  };
}

function deduplicateFindings(findings) {
  const seen = new Set();

  return findings.filter(finding => {
    const key = `${finding.code}|${finding.title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function summarizePage({
  navigationError,
  status,
  consoleMessages,
  failedRequests,
  httpErrors,
  successfulRequestKeys,
}) {
  const findings = [];

  if (navigationError) {
    findings.push({
      severity: 'critical',
      category: 'availability',
      code: 'NAVIGATION_FAILED',
      title: 'Page navigation failed',
      message: navigationError,
      userImpact: true,
    });
  }

  if (status >= 400) {
    findings.push({
      severity: status >= 500 ? 'critical' : 'error',
      category: 'availability',
      code: `MAIN_HTTP_${status}`,
      title: `Main page returned HTTP ${status}`,
      message: `The main document returned HTTP ${status}.`,
      userImpact: true,
    });
  }

  const httpStatuses =
    new Set(
      httpErrors.map(item =>
        String(item.status)
      )
    );

  const classifiedConsoleMessages =
    consoleMessages.filter(message => {
      const match =
        String(message).match(
          /failed to load resource.*status of\s+(\d+)/i
        );

      if (
        match &&
        httpStatuses.has(match[1])
      ) {
        return false;
      }

      return true;
    });

  findings.push(
    ...classifiedConsoleMessages.map(
      classifyConsoleMessage
    )
  );

  findings.push(
    ...failedRequests.map(request =>
      classifyFailedRequest(
        request,
        successfulRequestKeys
      )
    )
  );
  findings.push(...httpErrors.map(classifyHttpError));

  const uniqueFindings = deduplicateFindings(findings);

  const criticalCount = uniqueFindings.filter(
    finding => finding.severity === 'critical'
  ).length;

  const errorCount = uniqueFindings.filter(
    finding => finding.severity === 'error'
  ).length;

  const warningCount = uniqueFindings.filter(
    finding => finding.severity === 'warning'
  ).length;

  const infoCount = uniqueFindings.filter(
    finding => finding.severity === 'info'
  ).length;

  const userImpactingFindings = uniqueFindings.filter(
    finding => finding.userImpact
  );

  let healthStatus = 'passed';

  if (criticalCount > 0 || errorCount > 0) {
    healthStatus = 'failed';
  } else if (warningCount > 0) {
    healthStatus = 'passed-with-warnings';
  }

  return {
    healthStatus,
    healthy: userImpactingFindings.length === 0,
    criticalCount,
    errorCount,
    warningCount,
    infoCount,
    findings: uniqueFindings,
  };
}


const riskyInteractionPattern =
  /\b(delete|remove|purchase|buy|pay|checkout|place order|order now|send|submit|publish|post|confirm|deactivate|disable|logout|log out|sign out|unsubscribe|reset|clear|upload|invite|apply|book|reserve|save changes)\b/i;

const safeInteractionPattern =
  /\b(menu|more|show|expand|collapse|open|details|view|learn|filter|sort|options|settings|previous page|next page)\b/i;

const utilityInteractionPattern =
  /\b(show password|hide password|toggle password|password visibility)\b/i;

function interactionLabel(candidate) {
  return [
    candidate.text,
    candidate.ariaLabel,
    candidate.title,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSafeInteraction(candidate) {
  const label = interactionLabel(candidate);

  if (
    candidate.disabled ||
    candidate.hidden ||
    candidate.href ||
    candidate.type === 'submit'
  ) {
    return false;
  }

  if (riskyInteractionPattern.test(label)) {
    return false;
  }

  if (utilityInteractionPattern.test(label)) {
    return false;
  }

  if (candidate.tag === 'summary') {
    return true;
  }

  if (candidate.role === 'tab') {
    return true;
  }

  if (candidate.ariaExpanded !== null) {
    return true;
  }

  if (candidate.ariaHaspopup) {
    return true;
  }

  return safeInteractionPattern.test(label);
}

async function collectPageHrefs(page) {
  return page
    .locator('a[href]')
    .evaluateAll(elements =>
      elements
        .map(element =>
          element.getAttribute('href')
        )
        .filter(Boolean)
    )
    .catch(() => []);
}

async function discoverSafeInteractions({
  page,
  baseUrl,
  origin,
}) {
  const result = {
    enabled: interactionDiscoveryEnabled,
    candidatesFound: 0,
    safeCandidates: 0,
    clicked: 0,
    skipped: 0,
    navigationClicks: 0,
    discoveredRoutes: [],
    clickedLabels: [],
    errors: [],
  };

  if (!interactionDiscoveryEnabled) {
    return result;
  }

  const discoveredRoutes = new Set();

  const captureCurrentLinks = async () => {
    const hrefs = await collectPageHrefs(page);

    for (const href of hrefs) {
      const normalized =
        normalizeUrl(
          href,
          page.url() || baseUrl,
          origin
        );

      if (
        normalized &&
        !shouldSkip(normalized)
      ) {
        discoveredRoutes.add(normalized);
      }
    }
  };

  try {
    // Trigger lazy-loaded content.
    await page.evaluate(() => {
      window.scrollTo(
        0,
        document.body.scrollHeight
      );
    });

    await page.waitForTimeout(
      interactionWaitMs
    );

    await captureCurrentLinks();

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    const candidates = await page
      .locator(
        [
          'button',
          '[role="button"]',
          '[role="tab"]',
          'summary',
          '[aria-expanded]',
          '[aria-haspopup]',
        ].join(',')
      )
      .evaluateAll(elements =>
        elements.map((element, index) => {
          const id =
            `qa-sentinel-interaction-${index}`;

          element.setAttribute(
            'data-qa-sentinel-discovery-id',
            id
          );

          const style =
            window.getComputedStyle(element);

          const rect =
            element.getBoundingClientRect();

          const hidden =
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            rect.width === 0 ||
            rect.height === 0;

          return {
            id,

            tag:
              element.tagName
                .toLowerCase(),

            role:
              element.getAttribute('role') ??
              '',

            text:
              element.textContent?.trim() ??
              '',

            ariaLabel:
              element.getAttribute(
                'aria-label'
              ) ?? '',

            ariaExpanded:
              element.getAttribute(
                'aria-expanded'
              ),

            ariaHaspopup:
              Boolean(
                element.getAttribute(
                  'aria-haspopup'
                )
              ),

            title:
              element.getAttribute(
                'title'
              ) ?? '',

            href:
              element.getAttribute(
                'href'
              ),

            type:
              element instanceof HTMLButtonElement
                ? element.type
                : (
                    element.getAttribute(
                      'type'
                    ) ?? ''
                  ),

            disabled:
              Boolean(
                element.disabled ||
                element.getAttribute(
                  'aria-disabled'
                ) === 'true'
              ),

            hidden,
          };
        })
      )
      .catch(() => []);

    result.candidatesFound =
      candidates.length;

    const safeCandidates =
      candidates.filter(
        isSafeInteraction
      );

    result.safeCandidates =
      safeCandidates.length;

    result.skipped =
      candidates.length -
      safeCandidates.length;

    for (
      const candidate
      of safeCandidates.slice(
        0,
        maxInteractionsPerPage
      )
    ) {
      const locator = page.locator(
        `[data-qa-sentinel-discovery-id="${candidate.id}"]`
      );

      try {
        if (
          (await locator.count()) === 0 ||
          !(await locator.first().isVisible())
        ) {
          continue;
        }

        const beforeUrl = page.url();

        await locator.first().click({
          timeout: 2000,
        });

        result.clicked += 1;

        const label =
          interactionLabel(candidate);

        if (label) {
          result.clickedLabels.push(
            label.slice(0, 120)
          );
        }

        await page.waitForTimeout(
          interactionWaitMs
        );

        await captureCurrentLinks();

        const afterUrl = page.url();

        if (
          afterUrl &&
          afterUrl !== beforeUrl
        ) {
          result.navigationClicks += 1;

          const normalized =
            normalizeUrl(
              afterUrl,
              beforeUrl,
              origin
            );

          if (
            normalized &&
            !shouldSkip(normalized)
          ) {
            discoveredRoutes.add(
              normalized
            );
          }

          // Restore the page after discovering
          // JavaScript-driven navigation.
          await page
            .goto(baseUrl, {
              waitUntil:
                'domcontentloaded',
              timeout:
                navigationTimeout,
            })
            .catch(() => {});

          // The original DOM identifiers no
          // longer exist after navigation.
          break;
        }

        // Close menus/modals where Escape is
        // supported before testing another control.
        await page.keyboard
          .press('Escape')
          .catch(() => {});
      } catch (error) {
        result.errors.push(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    }
  } catch (error) {
    result.errors.push(
      error instanceof Error
        ? error.message
        : String(error)
    );
  }

  result.discoveredRoutes =
    [...discoveredRoutes];

  return result;
}

async function scanSite() {
  if (
    scanVariant === 'authenticated' &&
    !storageStateLoaded
  ) {
    throw new Error(
      'Authenticated discovery requested, but QA_STORAGE_STATE ' +
      'does not contain a usable Playwright storageState.'
    );
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const contextOptions = {
    ignoreHTTPSErrors: false,
  };

  if (storageStateLoaded) {
    contextOptions.storageState =
      storageStateFile;
  }

  const context =
    await browser.newContext(
      contextOptions
    );

  const page = await context.newPage();

  const origin = new URL(startUrl).origin;
  const queue = [];
  const queued = new Set();
  const visited = new Set();
  const pages = [];

  const normalizedStart = normalizeUrl(startUrl, startUrl, origin);

  if (!normalizedStart) {
    throw new Error(`Invalid start URL: ${startUrl}`);
  }

  queue.push(normalizedStart);
  queued.add(normalizedStart);

  for (
    const requestedSeed
    of requestedSeedRoutes
  ) {
    const normalizedSeed =
      normalizeUrl(
        requestedSeed,
        normalizedStart,
        origin
      );

    if (
      !normalizedSeed ||
      shouldSkip(normalizedSeed) ||
      queued.has(normalizedSeed)
    ) {
      continue;
    }

    queue.push(normalizedSeed);
    queued.add(normalizedSeed);
  }

  const divider = '='.repeat(62);

  console.log('');
  console.log(divider);
  console.log('             QA SENTINEL TYRA SMART SCANNER');
  console.log(divider);
  console.log(`Target URL       : ${normalizedStart}`);
  console.log(`Site id          : ${siteId}`);
  console.log(`Scan variant     : ${scanVariant}`);
  console.log(
    `Storage state    : ${
      storageStateLoaded
        ? 'loaded'
        : 'not loaded'
    }`
  );
  console.log(
    `Seed routes      : ${requestedSeedRoutes.length}`
  );
  console.log(`Maximum pages    : ${maxPages}`);
  console.log(`Navigation limit : ${navigationTimeout} ms`);
  console.log(
    `Interaction scan : ${
      interactionDiscoveryEnabled
        ? `enabled (max ${maxInteractionsPerPage}/page)`
        : 'disabled'
    }`
  );
  console.log('Classification   : warnings separated from user-impacting errors');
  console.log(divider);

  while (queue.length > 0 && pages.length < maxPages) {
    const currentUrl = queue.shift();

    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);

    const startedAt = Date.now();
    const consoleMessages = [];
    const failedRequests = [];
    const httpErrors = [];
    const successfulRequestKeys = new Set();

    const onConsole = message => {
      if (message.type() === 'error') {
        consoleMessages.push(message.text());
      }
    };

    const onRequestFailed = request => {
      const errorText =
        request.failure()?.errorText ??
        'Unknown network error';

      failedRequests.push({
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        error: errorText,
      });
    };

    const onResponse = response => {
      const responseStatus =
        response.status();

      const responseMethod =
        response.request().method();

      const responseUrl =
        response.url();

      if (responseStatus < 400) {
        successfulRequestKeys.add(
          requestKey(
            responseMethod,
            responseUrl
          )
        );
      }

      if (responseStatus >= 400) {
        httpErrors.push({
          status: responseStatus,
          method: responseMethod,
          url: responseUrl,
        });
      }
    };

    page.on('console', onConsole);
    page.on('requestfailed', onRequestFailed);
    page.on('response', onResponse);

    let status = 0;
    let title = '';
    let finalUrl = currentUrl;
    let navigationError = null;
    let linksFound = 0;

    let interactionDiscovery = {
      enabled:
        interactionDiscoveryEnabled,
      candidatesFound: 0,
      safeCandidates: 0,
      clicked: 0,
      skipped: 0,
      navigationClicks: 0,
      discoveredRoutes: [],
      clickedLabels: [],
      errors: [],
    };

    try {
      const response = await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: navigationTimeout,
      });

      status = response?.status() ?? 0;
      finalUrl = page.url();
      title = (await page.title()).trim();

      const linkLocator = page.locator('a[href]');

      if ((await linkLocator.count()) === 0) {
        await linkLocator
          .first()
          .waitFor({ state: 'attached', timeout: 5000 })
          .catch(() => {});
        await page.waitForTimeout(250);
      }

      const hrefs = await linkLocator.evaluateAll(elements =>
          elements
            .map(element => element.getAttribute('href'))
            .filter(Boolean)
        );

      linksFound = hrefs.length;

      for (const href of hrefs) {
        const normalized = normalizeUrl(href, finalUrl, origin);

        if (
          !normalized ||
          shouldSkip(normalized) ||
          visited.has(normalized) ||
          queued.has(normalized)
        ) {
          continue;
        }

        queue.push(normalized);
        queued.add(normalized);
      }

      interactionDiscovery =
        await discoverSafeInteractions({
          page,
          baseUrl: finalUrl,
          origin,
        });

      for (
        const discoveredUrl
        of interactionDiscovery
          .discoveredRoutes
      ) {
        if (
          !discoveredUrl ||
          shouldSkip(discoveredUrl) ||
          visited.has(discoveredUrl) ||
          queued.has(discoveredUrl)
        ) {
          continue;
        }

        queue.push(discoveredUrl);
        queued.add(discoveredUrl);
      }
    } catch (error) {
      navigationError =
        error instanceof Error
          ? error.message
          : String(error);
    } finally {
      page.off('console', onConsole);
      page.off('requestfailed', onRequestFailed);
      page.off('response', onResponse);
    }

    const assessment = summarizePage({
      navigationError,
      status,
      consoleMessages,
      failedRequests,
      httpErrors,
      successfulRequestKeys,
    });

    const result = {
      url: currentUrl,
      finalUrl,
      // Keep pathname as the requested route for
      // backwards compatibility with generated tests.
      pathname: new URL(currentUrl).pathname,

      requestedPathname:
        new URL(currentUrl).pathname,

      finalPathname:
        new URL(finalUrl).pathname,

      redirected:
        new URL(finalUrl).href !==
        new URL(currentUrl).href,

      authRedirected:
        scanVariant === 'authenticated' &&
        new URL(currentUrl).pathname !== '/signin' &&
        new URL(finalUrl).pathname === '/signin',

      status,
      title,
      duration: Date.now() - startedAt,
      linksFound,

      interactionDiscovery,

      // Raw evidence is retained for troubleshooting.
      consoleErrors: consoleMessages,
      failedRequests,
      httpErrors,
      error: navigationError,

      // Smart assessment used by the dashboard.
      ...assessment,
    };

    pages.push(result);

    const marker =
      result.healthStatus === 'passed'
        ? 'PASS'
        : result.healthStatus === 'passed-with-warnings'
          ? 'WARN'
          : 'FAIL';

    console.log(
      `[${marker}] ${result.status || 'ERR'} ${result.pathname} ` +
      `(${result.duration} ms, warnings: ${result.warningCount}, errors: ${result.errorCount + result.criticalCount})`
    );
  }

  await browser.close();

  const passedPages = pages.filter(
    item => item.healthStatus === 'passed'
  ).length;

  const warningPages = pages.filter(
    item => item.healthStatus === 'passed-with-warnings'
  ).length;

  const failedPages = pages.filter(
    item => item.healthStatus === 'failed'
  ).length;

  const totalWarnings = pages.reduce(
    (sum, item) => sum + item.warningCount,
    0
  );

  const totalErrors = pages.reduce(
    (sum, item) => sum + item.errorCount + item.criticalCount,
    0
  );

  const averageDuration =
    pages.length > 0
      ? Math.round(
          pages.reduce((sum, item) => sum + item.duration, 0) /
          pages.length
        )
      : 0;

  const totalInteractionClicks =
    pages.reduce(
      (sum, item) =>
        sum +
        (
          item.interactionDiscovery
            ?.clicked ?? 0
        ),
      0
    );

  const totalInteractionRoutes =
    new Set(
      pages.flatMap(item =>
        item.interactionDiscovery
          ?.discoveredRoutes ?? []
      )
    ).size;

  const uniqueRequestedRoutes =
    new Set(
      pages.map(
        item =>
          item.requestedPathname ??
          item.pathname
      )
    ).size;

  const uniqueFinalRoutes =
    new Set(
      pages.map(
        item =>
          item.finalPathname ??
          item.pathname
      )
    ).size;

  const redirectedPages =
    pages.filter(
      item =>
        item.redirected === true
    ).length;

  const authRedirectedPages =
    pages.filter(
      item =>
        item.authRedirected === true
    ).length;

  const report = {
    schemaVersion: 5,
    siteId,
    scanVariant,
    authenticated:
      scanVariant === 'authenticated',
    storageStateLoaded,
    seedRoutes:
      requestedSeedRoutes,
    startedFrom: normalizedStart,
    origin,
    scannedAt: new Date().toISOString(),
    maxPages,
    totalPages: pages.length,
    passedPages,
    warningPages,
    failedPages,
    healthyPages: passedPages + warningPages,
    unhealthyPages: failedPages,
    totalWarnings,
    totalErrors,
    averageDuration,

    uniqueRequestedRoutes,
    uniqueFinalRoutes,
    redirectedPages,
    authRedirectedPages,

    interactionDiscoveryEnabled,
    maxInteractionsPerPage,
    totalInteractionClicks,
    totalInteractionRoutes,

    coverageLimited:
      queue.length > 0 && pages.length >= maxPages,
    remainingQueue: queue.length,
    pages,
  };

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    outputFile,
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('');
  console.log(divider);
  console.log('                    SMART SCAN SUMMARY');
  console.log(divider);
  console.log(`Pages scanned          : ${report.totalPages}`);
  console.log(`Passed cleanly         : ${report.passedPages}`);
  console.log(`Passed with warnings   : ${report.warningPages}`);
  console.log(`Failed pages           : ${report.failedPages}`);
  console.log(`Total warnings         : ${report.totalWarnings}`);
  console.log(`User-impacting errors  : ${report.totalErrors}`);
  console.log(`Average page time      : ${report.averageDuration} ms`);
  console.log(`Unique requested routes: ${report.uniqueRequestedRoutes}`);
  console.log(`Unique final routes    : ${report.uniqueFinalRoutes}`);
  console.log(`Redirected pages       : ${report.redirectedPages}`);
  console.log(`Auth redirects         : ${report.authRedirectedPages}`);
  console.log(`Safe interactions      : ${report.totalInteractionClicks}`);
  console.log(`Interaction routes     : ${report.totalInteractionRoutes}`);
  console.log(`Coverage limited       : ${report.coverageLimited ? 'Yes' : 'No'}`);
  console.log(`Saved report           : ${outputFile}`);
  console.log(divider);
}

scanSite().catch(error => {
  console.error('');
  console.error('Website scanner failed:');
  console.error(error);
  process.exitCode = 1;
});

