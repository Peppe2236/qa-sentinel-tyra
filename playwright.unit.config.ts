import { defineConfig } from '@playwright/test';

/**
 * Isolated Playwright config for reporter/analyzer contract tests.
 * It must not use the QA dashboard reporter, or a unit run would
 * overwrite dashboard/data/latest-run.json.
 */
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 15_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ['list'],
  ],
  outputDir: 'test-results/unit',
});
