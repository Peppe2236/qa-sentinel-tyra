import {
  defineConfig,
  devices,
} from '@playwright/test';

import {
  SENTINEL_SITES,
} from './config/sites';


const nation =
  SENTINEL_SITES.find(
    site => site.id === 'nation'
  );

const aiSkills =
  SENTINEL_SITES.find(
    site => site.id === 'ai-skills'
  );


if (!nation) {
  throw new Error(
    'Sentinel site configuration for Nation was not found.'
  );
}

if (!aiSkills) {
  throw new Error(
    'Sentinel site configuration for AI Skills was not found.'
  );
}


export default defineConfig({

  // =========================================================
  // TEST DISCOVERY
  // =========================================================

  testDir: './tests',

  fullyParallel: true,

  forbidOnly:
    Boolean(process.env.CI),

  retries:
    process.env.CI
      ? 2
      : 0,

  workers:
    process.env.CI
      ? 1
      : undefined,


  // =========================================================
  // TIMEOUTS
  // =========================================================

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },


  // =========================================================
  // REPORTERS
  // =========================================================

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
        outputFolder:
          'playwright-report',

        open: 'never',
      },
    ],

    [
      'json',
      {
        outputFile:
          'test-results/playwright-results.json',
      },
    ],

    [
      './reporters/qa-dashboard-reporter.ts',
    ],
  ],


  // =========================================================
  // GLOBAL PLAYWRIGHT SETTINGS
  // =========================================================

  use: {

    trace:
      'on-first-retry',

    screenshot:
      'only-on-failure',

    video:
      'retain-on-failure',

    navigationTimeout:
      30_000,

    actionTimeout:
      10_000,

    ignoreHTTPSErrors:
      false,
  },


  // =========================================================
  // OUTPUT
  // =========================================================

  outputDir:
    'test-results',


  // =========================================================
  // SENTINEL MULTI-SITE PROJECTS
  // =========================================================

  projects: [

    // =======================================================
    // NATION
    // https://nation.dev/home
    // =======================================================

    {
      name:
        'nation-chromium',

      testMatch:
        /nation\/.*\.spec\.ts/,

      use: {
        ...devices[
          'Desktop Chrome'
        ],

        baseURL:
          nation.baseURL,
      },
    },


    {
      name:
        'nation-firefox',

      testMatch:
        /nation\/.*\.spec\.ts/,

      use: {
        ...devices[
          'Desktop Firefox'
        ],

        baseURL:
          nation.baseURL,
      },
    },


    {
      name:
        'nation-webkit',

      testMatch:
        /nation\/.*\.spec\.ts/,

      use: {
        ...devices[
          'Desktop Safari'
        ],

        baseURL:
          nation.baseURL,
      },
    },


    {
      name:
        'nation-mobile-chrome',

      testMatch:
        /nation\/.*\.spec\.ts/,

      use: {
        ...devices[
          'Pixel 7'
        ],

        baseURL:
          nation.baseURL,
      },
    },


    {
      name:
        'nation-mobile-safari',

      testMatch:
        /nation\/.*\.spec\.ts/,

      use: {
        ...devices[
          'iPhone 15'
        ],

        baseURL:
          nation.baseURL,
      },
    },


    {
      name:
        'nation-tablet',

      testMatch:
        /nation\/.*\.spec\.ts/,

      use: {
        ...devices[
          'iPad Pro 11'
        ],

        baseURL:
          nation.baseURL,
      },
    },


    // =======================================================
    // AI SKILLS
    // https://aiskills.nation.dev/
    // =======================================================

   {
  name:
    'ai-skills-chromium',

  testMatch:
  'skills/**/*.spec.ts',

  use: {
    ...devices[
      'Desktop Chrome'
    ],

    baseURL:
      aiSkills.baseURL,
  },
},

{
  name:
    'ai-skills-firefox',

  testMatch:
  'skills/**/*.spec.ts',

  use: {
    ...devices[
      'Desktop Firefox'
    ],

    baseURL:
      aiSkills.baseURL,
  },
},

{
  name:
    'ai-skills-webkit',

  testMatch:
  'skills/**/*.spec.ts',

  use: {
    ...devices[
      'Desktop Safari'
    ],

    baseURL:
      aiSkills.baseURL,
  },
},

{
  name:
    'ai-skills-mobile-chrome',

  testMatch:
  'skills/**/*.spec.ts',

  use: {
    ...devices[
      'Pixel 7'
    ],

    baseURL:
      aiSkills.baseURL,
  },
},

{
  name:
    'ai-skills-mobile-safari',

  testMatch:
  'skills/**/*.spec.ts',

  use: {
    ...devices[
      'iPhone 15'
    ],

    baseURL:
      aiSkills.baseURL,
  },
},

{
  name:
    'ai-skills-tablet',

  testMatch:
  'skills/**/*.spec.ts',

  use: {
    ...devices[
      'iPad Pro 11'
    ],

    baseURL:
      aiSkills.baseURL,
  },
},
],
});