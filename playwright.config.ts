import fs from 'node:fs';
import path from 'node:path';

import {
  defineConfig,
  devices,
  type Project,
} from '@playwright/test';

import {
  BROWSER_FAMILY,
  FORM_FACTOR_PROFILE,
  MATRIX_BROWSERS,
  MATRIX_FORM_FACTORS,
  playwrightProjectName,
  type MatrixBrowser,
  type MatrixFormFactor,
  type MatrixSite,
} from './config/playwright-matrix';

import {
  SENTINEL_SITES,
  type SentinelSite,
} from './config/sites';

function loadLocalEnv(fileName: string): void {
  const filePath = path.resolve(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv('.env');

function requireSite(id: MatrixSite): SentinelSite {
  const site = SENTINEL_SITES.find(candidate => candidate.id === id);

  if (!site) {
    throw new Error(`Sentinel site configuration for ${id} was not found.`);
  }

  return site;
}

const nation = requireSite('nation');
const aiSkills = requireSite('ai-skills');
const configuredSites: SentinelSite[] = [nation, aiSkills];

function requireDevice(name: string) {
  const device = devices[name];

  if (!device) {
    throw new Error(
      `Playwright device "${name}" is not available in this Playwright version.`
    );
  }

  return device;
}

function deviceFor(
  browser: MatrixBrowser,
  formFactor: MatrixFormFactor
) {
  if (formFactor === 'desktop') {
    if (browser === 'chromium') {
      return {
        ...requireDevice('Desktop Chrome'),
        viewport: { width: 1280, height: 720 },
      };
    }

    if (browser === 'firefox') {
      return requireDevice('Desktop Firefox');
    }

    return requireDevice('Desktop Safari');
  }

  if (formFactor === 'tablet') {
    return {
      ...requireDevice('iPad Pro 11'),
      browserName: browser,
    };
  }

  if (browser === 'webkit') {
    return requireDevice('iPhone 12');
  }

  return {
    ...requireDevice('Pixel 5'),
    browserName: browser,
  };
}

function handwrittenTestMatch(site: SentinelSite): Project['testMatch'] {
  return site.id === 'nation'
    ? ['nation/**/*.spec.ts']
    : ['skills/**/*.spec.ts'];
}

function dailyChromiumTestMatch(site: SentinelSite): Project['testMatch'] {
  if (site.id === 'nation') {
    return [
      'nation/**/*.spec.ts',
      'discovery/**/*.spec.ts',
      'diagnostics/**/*.spec.ts',
      'generated/discovered-pages-nation.spec.ts',
    ];
  }

  return [
    'skills/**/*.spec.ts',
    'discovery/**/*.spec.ts',
    'generated/discovered-pages-ai-skills.spec.ts',
  ];
}

function isDailyChromium(
  browser: MatrixBrowser,
  formFactor: MatrixFormFactor
): boolean {
  return browser === 'chromium' && formFactor === 'desktop';
}

function buildMatrixProjects(): Project[] {
  const projects: Project[] = [];

  for (const site of configuredSites) {
    for (const browser of MATRIX_BROWSERS) {
      for (const formFactor of MATRIX_FORM_FACTORS) {
        projects.push({
          name: playwrightProjectName(site.id as MatrixSite, browser, formFactor),
          testMatch: isDailyChromium(browser, formFactor)
            ? dailyChromiumTestMatch(site)
            : handwrittenTestMatch(site),
          dependencies:
            site.id === 'nation'
              ? ['nation-auth-setup']
              : ['ai-skills-auth-setup'],
          metadata: {
            browserFamily: BROWSER_FAMILY[browser],
            profile: FORM_FACTOR_PROFILE[formFactor],
          },
          use: {
            ...deviceFor(browser, formFactor),
            baseURL: site.baseURL,
          },
        });
      }
    }
  }

  return projects;
}

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

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
    [
      './reporters/qa-dashboard-reporter.ts',
    ],
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
    ignoreHTTPSErrors: false,
  },

  outputDir: 'test-results',

  /*
   * 18 projects: both sites × Chromium/Firefox/WebKit × desktop/tablet/mobile.
   * Generated discovered-page smoke is limited to daily Chromium desktop
   * (nation-chromium, ai-skills-chromium) so qa:matrix does not multiply it.
   * Microsoft Edge is not a separate project; Chromium covers the Edge engine.
   */
  projects: [
    {
      name: 'nation-auth-setup',
      testMatch: 'auth/nation.setup.ts',
      use: {
        ...deviceFor('chromium', 'desktop'),
        baseURL: nation.baseURL,
      },
    },
    {
      name: 'ai-skills-auth-setup',
      testMatch: 'auth/ai-skills.setup.ts',
      use: {
        ...deviceFor('chromium', 'desktop'),
        baseURL: aiSkills.baseURL,
      },
    },
    ...buildMatrixProjects(),
  ],
});
