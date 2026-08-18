export const MATRIX_SITES = ['nation', 'ai-skills'] as const;

export const MATRIX_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;

export const MATRIX_FORM_FACTORS = ['desktop', 'tablet', 'mobile'] as const;

export type MatrixSite = (typeof MATRIX_SITES)[number];

export type MatrixBrowser = (typeof MATRIX_BROWSERS)[number];

export type MatrixFormFactor = (typeof MATRIX_FORM_FACTORS)[number];

export const BROWSER_FAMILY: Record<MatrixBrowser, string> = {
  chromium: 'Chromium',
  firefox: 'Firefox',
  webkit: 'WebKit',
};

export const FORM_FACTOR_PROFILE: Record<MatrixFormFactor, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

export const EDGE_MATRIX_NOTE =
  'Microsoft Edge is not a separate Playwright project. Chromium covers the Edge Blink engine.';

export function playwrightProjectName(
  site: MatrixSite,
  browser: MatrixBrowser,
  formFactor: MatrixFormFactor
): string {
  if (browser === 'chromium' && formFactor === 'desktop') {
    return `${site}-chromium`;
  }

  return `${site}-${browser}-${formFactor}`;
}

export function allPlaywrightProjectNames(): string[] {
  const names: string[] = [];

  for (const site of MATRIX_SITES) {
    for (const browser of MATRIX_BROWSERS) {
      for (const formFactor of MATRIX_FORM_FACTORS) {
        names.push(playwrightProjectName(site, browser, formFactor));
      }
    }
  }

  return names;
}

export const DAILY_CHROMIUM_PROJECTS = [
  playwrightProjectName('nation', 'chromium', 'desktop'),
  playwrightProjectName('ai-skills', 'chromium', 'desktop'),
] as const;

export const PLAYWRIGHT_PROJECT_COUNT = MATRIX_SITES.length
  * MATRIX_BROWSERS.length
  * MATRIX_FORM_FACTORS.length;
