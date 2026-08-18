import { spawnSync } from 'node:child_process';
import process from 'node:process';

const PROJECTS = [
  'nation-firefox',
  'nation-webkit',
  'nation-mobile-chrome',
  'ai-skills-firefox',
  'ai-skills-webkit',
  'ai-skills-mobile-chrome',
];

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
console.log('  QA Sentinel Tyra — compatibility smoke');
console.log('==================================================');
console.log('Sites: nation.dev + aiskills.nation.dev');
console.log('Subset: @compat smoke (homepage + sign-in form)');
console.log(`Projects: ${PROJECTS.join(', ')}`);
console.log('Does not require NATION_TEST_* or AI_SKILLS_TEST_*.');
console.log('This overwrites dashboard/data/latest-run.json.');
console.log('==================================================');

const playwrightArgs = [
  'tests/nation/homepage.spec.ts',
  'tests/nation/Authentication.spec.ts',
  'tests/skills/homepage.spec.ts',
  '--grep=@compat',
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
    '[QA Sentinel] Install extra browsers with: npx playwright install firefox webkit'
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
  '[QA Sentinel] Browsers that did not execute are not-in-this-run, not poor.'
);
console.log('[QA Sentinel] Open it with: npm run dashboard');
console.log('==================================================');
