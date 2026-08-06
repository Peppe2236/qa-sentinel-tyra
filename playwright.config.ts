import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Alla testfiler ligger i mappen tests.
  testDir: './tests',

  // Tillåter att tester körs parallellt.
  fullyParallel: true,

  // Stoppar körningen om test.only råkar finnas i CI.
  forbidOnly: Boolean(process.env.CI),

  // Fler försök i GitHub Actions, inga automatiska försök lokalt.
  retries: process.env.CI ? 2 : 0,

  // Begränsa antalet parallella workers i CI.
  workers: process.env.CI ? 1 : undefined,

  // Maximal tid för varje test.
  timeout: 30_000,

  // Tid för varje enskild expect-kontroll.
  expect: {
    timeout: 5_000,
  },

  // Kör både terminalrapport, Playwrights HTML-rapport
  // och vår egen QA-dashboard-reporter.
  reporter: [
    [
      'list',
      {
        printSteps: true,
        printFailuresInline: true,
      },
    ],
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never',
      },
    ],
    [
      'json',
      {
        outputFile: 'test-results/playwright-results.json',
      },
    ],
    ['./reporters/qa-dashboard-reporter.ts'],
  ],

  use: {
    // Grundadress för Nation AI Skills.
    baseURL: 'https://aiskills.nation.dev',

    // Samlar trace första gången ett misslyckat test körs om.
    trace: 'on-first-retry',

    // Sparar skärmbild endast när testet misslyckas.
    screenshot: 'only-on-failure',

    // Spelar in video men behåller den endast vid fel.
    video: 'retain-on-failure',

    // Maximal tid för navigering.
    navigationTimeout: 30_000,

    // Maximal tid för vanliga actions.
    actionTimeout: 10_000,

    // Ignorera inte HTTPS-fel.
    ignoreHTTPSErrors: false,
  },

  // Resultat, bilder, videor och traces sparas här.
  outputDir: 'test-results',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 15'],
      },
    },

    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
  ],
});