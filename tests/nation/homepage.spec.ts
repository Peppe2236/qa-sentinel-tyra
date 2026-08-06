import { test, expect, type Page } from '@playwright/test';

const NATION_URL = 'https://nation.dev/';

interface Diagnostics {
  consoleErrors: string[];
  failedRequests: string[];
  httpErrors: string[];
}

function collectDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
  };

  page.on('console', message => {
    if (message.type() !== 'error') {
      return;
    }

    const text = message.text();

    const isKnownTrackingWarning =
      text.includes('google-analytics.com') ||
      text.includes('clarity.ms') ||
      text.includes('Content Security Policy');

    if (!isKnownTrackingWarning) {
      diagnostics.consoleErrors.push(text);
    }
  });

  page.on('requestfailed', request => {
    const url = request.url();
    const error = request.failure()?.errorText ?? 'Unknown error';

    const isExpectedFailure =
      url.includes('google-analytics.com') ||
      url.includes('clarity.ms') ||
      url.includes('_rsc=') && error.includes('ERR_ABORTED');

    if (!isExpectedFailure) {
      diagnostics.failedRequests.push(
        `${request.method()} ${url} - ${error}`
      );
    }
  });

  page.on('response', response => {
    if (response.status() < 400) {
      return;
    }

    diagnostics.httpErrors.push(
      `${response.status()} ${response.request().method()} ${response.url()}`
    );
  });

  return diagnostics;
}

test.describe('Nation.dev homepage technical checks', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto(NATION_URL, {
      waitUntil: 'domcontentloaded',
    });

    expect(
      response,
      'Homepage returned no response'
    ).not.toBeNull();

    expect(
      response?.status(),
      `Homepage returned HTTP ${response?.status()}`
    ).toBeLessThan(400);
  });

  test('homepage has a non-empty title', async ({ page }) => {
    await page.goto(NATION_URL, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveTitle(/\S+/);
  });

  test('homepage contains visible content', async ({ page }) => {
    await page.goto(NATION_URL, {
      waitUntil: 'domcontentloaded',
    });

    const body = page.locator('body');

    await expect(body).toBeVisible();

    const text = (await body.innerText()).trim();

    expect(
      text.length,
      'Homepage contains too little visible content'
    ).toBeGreaterThan(100);
  });

  test('homepage has no unexpected JavaScript errors', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);

    await page.goto(NATION_URL, {
      waitUntil: 'networkidle',
    });

    expect(
      diagnostics.consoleErrors,
      `Unexpected console errors:\n${diagnostics.consoleErrors.join('\n')}`
    ).toEqual([]);
  });

  test('homepage has no unexpected failed requests', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);

    await page.goto(NATION_URL, {
      waitUntil: 'networkidle',
    });

    expect(
      diagnostics.failedRequests,
      `Unexpected failed requests:\n${diagnostics.failedRequests.join('\n')}`
    ).toEqual([]);
  });

  test('homepage has no HTTP 4xx or 5xx responses', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);

    await page.goto(NATION_URL, {
      waitUntil: 'networkidle',
    });

    expect(
      diagnostics.httpErrors,
      `HTTP errors found:\n${diagnostics.httpErrors.join('\n')}`
    ).toEqual([]);
  });

  test('visible internal links have valid URLs', async ({ page }) => {
    await page.goto(NATION_URL, {
      waitUntil: 'domcontentloaded',
    });

    const links = page.locator('a:visible');
    const count = await links.count();

    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute('href');

      if (!href) {
        continue;
      }

      const isValid =
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('https://');

      expect(
        isValid,
        `Malformed link found: ${href}`
      ).toBeTruthy();
    }
  });
});