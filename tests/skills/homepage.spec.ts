import { test, expect } from '@playwright/test';
import { attachDiagnostics, formatDiagnostics, type Diagnostics } from '../../utils/diagnostics';

const SKILLS_URL = 'https://aiskills.nation.dev/skills';

test.describe('AI Skills page', () => {
  let diagnostics: Diagnostics;

  test.beforeEach(async ({ page }) => {
    diagnostics = attachDiagnostics(page);

    const response = await page.goto(SKILLS_URL, {
      waitUntil: 'domcontentloaded',
    });

    expect(response, 'The main page request returned no response').not.toBeNull();
    expect(response?.status(), `The main page returned HTTP ${response?.status()}`).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/aiskills\.nation\.dev\/skills/);
  });

  test('page has a non-empty title', async ({ page }) => {
    expect((await page.title()).trim(), 'The HTML title is empty').not.toBe('');
  });

  test('page contains visible content', async ({ page }) => {
    const text = (await page.locator('body').innerText()).trim();
    expect(text.length, 'The page contains too little visible text').toBeGreaterThan(20);
  });

  test('page has no unexpected JavaScript errors', async () => {
    expect(
      diagnostics.consoleErrors,
      formatDiagnostics('Console errors', diagnostics.consoleErrors)
    ).toEqual([]);
  });

  test('page has no unexpected failed requests', async () => {
    expect(
      diagnostics.failedRequests,
      formatDiagnostics('Failed requests', diagnostics.failedRequests)
    ).toEqual([]);
  });

  test('page has no HTTP 4xx or 5xx responses', async () => {
    expect(
      diagnostics.httpErrors,
      formatDiagnostics('HTTP errors', diagnostics.httpErrors)
    ).toEqual([]);
  });
});
