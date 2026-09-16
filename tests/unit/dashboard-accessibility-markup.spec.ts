import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

function dashboardFile(name: string): string {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'dashboard', name),
    'utf8'
  );
}

test.describe('dashboard accessibility markup', () => {
  test('dashboard exposes a keyboard skip link and labelled main landmark', () => {
    const html = dashboardFile('index.html');

    expect(html).toContain('class="skip-link" href="#dashboard-main"');
    expect(html).toContain('<main id="dashboard-main" tabindex="-1">');
    expect(html).toContain('aria-live="polite"');
  });

  test('settings page exposes the same display accessibility support', () => {
    const html = dashboardFile('settings.html');

    expect(html).toContain('class="skip-link" href="#settings-main"');
    expect(html).toContain('accessibility-preferences.css');
    expect(html).toContain('accessibility-preferences.mjs');
  });

  test('accessibility controls include supported colour and text modes', () => {
    const script = dashboardFile('accessibility-preferences.mjs');

    expect(script).toContain("'high-contrast'");
    expect(script).toContain("'red-green'");
    expect(script).toContain("'blue-yellow'");
    expect(script).toContain("'monochrome'");
    expect(script).toContain("'extra-large'");
    expect(script).toContain('aria-live="polite"');
  });
});
