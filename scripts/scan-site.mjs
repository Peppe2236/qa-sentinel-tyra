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

const outputDirectory = path.resolve(process.cwd(), 'dashboard', 'data');
const outputFile = path.join(
  outputDirectory,
  `discovered-pages-${siteId}.json`
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
        key === 'gclid'
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

function classifyFailedRequest(request) {
  const url = request.url;
  const error = String(request.error ?? '').toLowerCase();

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

  findings.push(...consoleMessages.map(classifyConsoleMessage));
  findings.push(...failedRequests.map(classifyFailedRequest));
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

async function scanSite() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: false });
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

  const divider = '='.repeat(62);

  console.log('');
  console.log(divider);
  console.log('             QA SENTINEL TYRA SMART SCANNER');
  console.log(divider);
  console.log(`Target URL       : ${normalizedStart}`);
  console.log(`Site id          : ${siteId}`);
  console.log(`Maximum pages    : ${maxPages}`);
  console.log(`Navigation limit : ${navigationTimeout} ms`);
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
        error: errorText,
      });
    };

    const onResponse = response => {
      if (response.status() >= 400) {
        httpErrors.push({
          status: response.status(),
          method: response.request().method(),
          url: response.url(),
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
    });

    const result = {
      url: currentUrl,
      finalUrl,
      pathname: new URL(currentUrl).pathname,
      status,
      title,
      duration: Date.now() - startedAt,
      linksFound,

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

  const report = {
    schemaVersion: 2,
    siteId,
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

