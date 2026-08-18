import { spawnSync } from 'node:child_process';
import process from 'node:process';

export const MATRIX_PROJECTS = [
  'nation-chromium',
  'nation-chromium-tablet',
  'nation-chromium-mobile',
  'nation-firefox-desktop',
  'nation-firefox-tablet',
  'nation-firefox-mobile',
  'nation-webkit-desktop',
  'nation-webkit-tablet',
  'nation-webkit-mobile',
  'ai-skills-chromium',
  'ai-skills-chromium-tablet',
  'ai-skills-chromium-mobile',
  'ai-skills-firefox-desktop',
  'ai-skills-firefox-tablet',
  'ai-skills-firefox-mobile',
  'ai-skills-webkit-desktop',
  'ai-skills-webkit-tablet',
  'ai-skills-webkit-mobile',
];

export const DAILY_CHROMIUM_PROJECTS = [
  'nation-chromium',
  'ai-skills-chromium',
];

export function ensureScanLimit() {
  if (!process.env.QA_MAX_PAGES) {
    process.env.QA_MAX_PAGES = '20';
  }
}

export function runNode(script, args = []) {
  if (process.platform === 'win32') {
    const command = process.env.ComSpec ?? 'cmd.exe';

    return spawnSync(
      command,
      ['/d', '/s', '/c', `node ${script} ${args.join(' ')}`.trim()],
      {
        stdio: 'inherit',
        shell: false,
        env: process.env,
      }
    );
  }

  return spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

export function runPlaywright(args) {
  if (process.platform === 'win32') {
    const command = process.env.ComSpec ?? 'cmd.exe';

    return spawnSync(
      command,
      ['/d', '/s', '/c', `npx playwright test ${args.join(' ')}`],
      {
        stdio: 'inherit',
        shell: false,
        env: process.env,
      }
    );
  }

  return spawnSync('npx', ['playwright', 'test', ...args], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

export function fail(label, result) {
  if (result.error) {
    console.error(`[QA Sentinel] ${label} could not be started.`);
    console.error(`[QA Sentinel] ${result.error.message}`);
    process.exitCode = 1;
    return true;
  }

  if ((result.status ?? 1) !== 0) {
    console.error(
      `[QA Sentinel] ${label} finished with exit code ${result.status ?? 1}.`
    );
    process.exitCode = result.status ?? 1;
    return true;
  }

  return false;
}

export function scanNation() {
  console.log('[QA Sentinel] Scanning https://nation.dev/ (bounded)...');
  return runNode('scripts/scan-site.mjs', ['https://nation.dev/', 'nation']);
}

export function scanSkills() {
  console.log(
    '[QA Sentinel] Scanning https://aiskills.nation.dev/skills (bounded)...'
  );
  return runNode('scripts/scan-site.mjs', [
    'https://aiskills.nation.dev/skills',
    'ai-skills',
  ]);
}

export function projectArgs(projects) {
  return projects.map(project => `--project=${project}`);
}
