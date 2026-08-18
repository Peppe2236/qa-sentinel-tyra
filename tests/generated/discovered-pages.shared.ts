import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

interface DiscoveredPage {
  url: string;
  pathname: string;
}

interface ScannerReport {
  siteId: string;
  origin: string;
  pages: DiscoveredPage[];
}

interface DiscoveredPageTestOptions {
  siteId: string;
  siteName: string;
  expectedOrigin: string;
  reportFile: string;
  scanCommand: string;
}

function loadScannerReport(
  options: DiscoveredPageTestOptions
): ScannerReport | null {
  const scannerFile = path.resolve(
    process.cwd(),
    'dashboard',
    'data',
    options.reportFile
  );

  if (!fs.existsSync(scannerFile)) {
    return null;
  }

  const parsed: unknown = JSON.parse(
    fs.readFileSync(scannerFile, 'utf-8')
  );

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${options.reportFile} does not contain a scanner report.`);
  }

  const report = parsed as Partial<ScannerReport>;
  const expectedOrigin = new URL(options.expectedOrigin).origin;

  if (report.siteId !== options.siteId) {
    throw new Error(
      `${options.reportFile} belongs to ${String(report.siteId)}, not ${options.siteId}.`
    );
  }

  if (report.origin !== expectedOrigin) {
    throw new Error(
      `${options.reportFile} has origin ${String(report.origin)}, not ${expectedOrigin}.`
    );
  }

  if (!Array.isArray(report.pages)) {
    throw new Error(`${options.reportFile} does not contain a pages array.`);
  }

  for (const discoveredPage of report.pages) {
    if (
      !discoveredPage ||
      typeof discoveredPage.url !== 'string' ||
      typeof discoveredPage.pathname !== 'string'
    ) {
      throw new Error(`${options.reportFile} contains an invalid page entry.`);
    }

    if (new URL(discoveredPage.url).origin !== expectedOrigin) {
      throw new Error(
        `${options.reportFile} contains an out-of-origin URL: ${discoveredPage.url}`
      );
    }
  }

  return report as ScannerReport;
}

export function defineDiscoveredPageTests(
  options: DiscoveredPageTestOptions
): void {
  const scannerReport = loadScannerReport(options);

  test.describe(`Automatically discovered pages - ${options.siteName}`, () => {
    if (!scannerReport || scannerReport.pages.length === 0) {
      test(`${options.siteName} scan output is available`, () => {
        test.skip(
          true,
          `Run ${options.scanCommand} first to discover ${options.siteName} pages.`
        );
      });
      return;
    }

    for (const [index, discoveredPage] of scannerReport.pages.entries()) {
      const route = discoveredPage.pathname || '/';

      test(`${route} [${index + 1}] loads without a main HTTP error`, async ({
        page,
      }) => {
        const response = await page.goto(discoveredPage.url, {
          waitUntil: 'domcontentloaded',
        });

        expect(
          response,
          `No response was returned for ${discoveredPage.url}`
        ).not.toBeNull();

        expect(
          response?.status(),
          `${discoveredPage.url} returned HTTP ${response?.status()}`
        ).toBeLessThan(400);

        await expect(page.locator('body')).toBeVisible();
      });
    }
  });
}
