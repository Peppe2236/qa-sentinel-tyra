import { spawnSync } from 'node:child_process';
import process from 'node:process';

const SITES = ['nation', 'ai-skills'];
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const FORM_FACTORS = ['desktop', 'tablet', 'mobile'];

function projectName(site, browser, formFactor) {
  if (browser === 'chromium' && formFactor === 'desktop') {
    return `${site}-chromium`;
  }

  return `${site}-${browser}-${formFactor}`;
}

const PROJECTS = SITES.flatMap(site =>
  BROWSERS.flatMap(browser =>
    FORM_FACTORS.map(formFactor => projectName(site, browser, formFactor))
  )
);

function runPlaywright(args) {
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

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — browser × device matrix');
console.log('==================================================');
console.log('Sites: nation.dev + aiskills.nation.dev');
console.log(
  'Engines: Chromium (Chrome/Edge), Firefox, WebKit (Safari)'
);
console.log('Form factors: Desktop, Tablet, Mobile');
console.log(`Projects: ${PROJECTS.length} (${SITES.length} sites × ${BROWSERS.length} browsers × ${FORM_FACTORS.length} form factors)`);
console.log(
  'Hand-written Nation + Skills tests only. Generated page smoke stays on qa:sites Chromium.'
);
console.log('Does not require NATION_TEST_* or AI_SKILLS_TEST_*.');
console.log('Product-bug tests are kept.');
console.log('This overwrites dashboard/data/latest-run.json.');
console.log('Install browsers: npx playwright install chromium firefox webkit');
console.log('==================================================');

const playwrightArgs = [
  'tests/nation',
  'tests/skills',
  '--timeout=45000',
  ...PROJECTS.map(project => `--project=${project}`),
];

console.log(
  `[QA Sentinel] Running Playwright: ${playwrightArgs.join(' ')}`
);

const tests = runPlaywright(playwrightArgs);

if (tests.error) {
  console.error('[QA Sentinel] Playwright could not be started.');
  console.error(`[QA Sentinel] ${tests.error.message}`);
  console.error(
    '[QA Sentinel] Install browsers with: npx playwright install chromium firefox webkit'
  );
  process.exitCode = 1;
} else {
  process.exitCode = tests.status ?? 1;
}

console.log('');
console.log(
  '[QA Sentinel] One dashboard run was written to dashboard/data/latest-run.json.'
);
console.log(
  '[QA Sentinel] Chrome / Firefox / Safari and Desktop / Tablet / Mobile cards are measured from this run.'
);
console.log('[QA Sentinel] Open it with: npm run dashboard');
console.log('==================================================');
