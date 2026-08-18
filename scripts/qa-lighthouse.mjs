import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const reportsDirectory = path.join(projectRoot, 'reports');
const LIGHTHOUSE_PKG = 'lighthouse@12.8.2';

const TARGETS = [
  {
    name: 'nation',
    url: 'https://nation.dev/',
    output: path.join(reportsDirectory, 'lighthouse-nation.json'),
  },
  {
    name: 'skills',
    url: 'https://aiskills.nation.dev/skills',
    output: path.join(reportsDirectory, 'lighthouse-skills.json'),
  },
];

function chromePath() {
  try {
    return chromium.executablePath();
  } catch {
    return '';
  }
}

function runLighthouse(url, outputPath, executablePath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const chromeArg = executablePath
    ? ` --chrome-path="${executablePath}"`
    : '';
  const commandLine = [
    'npx --yes',
    LIGHTHOUSE_PKG,
    `"${url}"`,
    '--output=json',
    `--output-path="${outputPath}"`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--quiet',
    '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"',
    chromeArg,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (process.platform === 'win32') {
    const command = process.env.ComSpec ?? 'cmd.exe';

    return spawnSync(command, ['/d', '/s', '/c', commandLine], {
      stdio: 'inherit',
      cwd: projectRoot,
      env: process.env,
    });
  }

  return spawnSync(commandLine, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env,
    shell: true,
  });
}

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — Lighthouse');
console.log('==================================================');
console.log('Pages: nation.dev homepage + AI Skills catalog');
console.log('Does not log in and does not complete an assessment.');
console.log('Writes reports/lighthouse-nation.json and reports/lighthouse-skills.json');
console.log('The Playwright reporter attaches these as performance notes if present.');
console.log('==================================================');

const executablePath = chromePath();

if (!executablePath) {
  console.error(
    '[QA Sentinel] Playwright Chromium was not found. Run: npx playwright install chromium'
  );
  process.exitCode = 1;
} else {
  console.log(`[QA Sentinel] Chrome: ${executablePath}`);
}

let failed = !executablePath;

for (const target of TARGETS) {
  if (failed) {
    break;
  }

  console.log(`[QA Sentinel] Lighthouse ${target.name}: ${target.url}`);
  const result = runLighthouse(target.url, target.output, executablePath);

  if (result.status !== 0) {
    console.error(`[QA Sentinel] Lighthouse failed for ${target.name}`);
    failed = true;
    break;
  }

  if (!fs.existsSync(target.output)) {
    console.error(`[QA Sentinel] Missing ${target.output}`);
    failed = true;
    break;
  }

  console.log(`[QA Sentinel] Wrote ${path.relative(projectRoot, target.output)}`);
}

if (failed) {
  process.exitCode = 1;
}

console.log('==================================================');
