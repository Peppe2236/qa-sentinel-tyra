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
    expect(html).toContain('id="accessibility-tools-mount"');
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
    expect(script).toContain("document.querySelector('.topbar .run-metadata')");
    expect(script).toContain("runMetadata.insertAdjacentElement('afterend', mount)");
  });

  test('dashboard server serves browser modules as JavaScript', () => {
    const server = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts', 'serve-dashboard.mjs'),
      'utf8'
    );

    expect(server).toContain("'.mjs': 'text/javascript; charset=utf-8'");
  });

  test('monochrome mode filters safe regions without filtering the body', () => {
    const styles = dashboardFile('accessibility-preferences.css');

    expect(styles).not.toMatch(
      /html\[data-vision-mode='monochrome'\] body\s*\{[^}]*filter:/s
    );
    expect(styles).toContain(
      ':is(.sample-data-banner, .topbar, main, footer)'
    );
    expect(styles).toContain('filter: grayscale(1)');
    expect(styles).toContain('repeating-linear-gradient(');
    expect(styles).toContain('border-left-style: dashed');
    expect(styles).toContain('border-left-style: double');
    expect(styles).toContain("html[data-vision-mode='monochrome']");
  });
});
