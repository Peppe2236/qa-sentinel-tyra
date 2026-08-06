import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type DiscoveredPage = {
  url: string;
  pathname: string;
};

type ScannerReport = {
  pages: DiscoveredPage[];
};

const scannerFile = path.resolve(
  process.cwd(),
  'dashboard',
  'data',
  'discovered-pages.json'
);

const scannerReport: ScannerReport = fs.existsSync(scannerFile)
  ? JSON.parse(fs.readFileSync(scannerFile, 'utf-8'))
  : { pages: [] };

test.describe('Automatically discovered pages', () => {
  test.skip(
    scannerReport.pages.length === 0,
    'Run npm run scan first to discover pages.'
  );

  for (const discoveredPage of scannerReport.pages) {
    test(`${discoveredPage.pathname || '/'} loads without a main HTTP error`, async ({
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
