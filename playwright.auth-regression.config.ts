import { defineConfig } from '@playwright/test';

// Local fixtures only; never use live site setup or the dashboard reporter.
export default defineConfig({
  testDir: './tests/auth-regression',
  fullyParallel: false,
  workers: 1,
  timeout: 15000,
  reporter: 'list',
  outputDir: 'test-results/auth-regression',
});
