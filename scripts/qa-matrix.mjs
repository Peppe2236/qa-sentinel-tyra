import process from 'node:process';

import {
  fail,
  MATRIX_PROJECTS,
  projectArgs,
  runPlaywright,
} from './qa-cli.mjs';

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — browser × device matrix');
console.log('==================================================');
console.log('Sites: nation.dev + aiskills.nation.dev');
console.log(
  'Engines: Chromium (Chrome/Edge), Firefox, WebKit (Safari)'
);
console.log('Form factors: Desktop, Tablet, Mobile');
console.log(
  `Projects: ${MATRIX_PROJECTS.length} (2 sites × 3 browsers × 3 form factors)`
);
console.log(
  'No scan. For scan + matrix + human pack use npm run qa:unattended.'
);
console.log(
  'Generated page smoke, Deep Discovery crawl and diagnostics stay on daily Chromium via testMatch.'
);
console.log(
  'Still unattended. Slower than qa:sites. Auth setup runs once per site when credentials exist.'
);
console.log('Does not require NATION_TEST_* or AI_SKILLS_TEST_*.');
console.log('This overwrites dashboard/data/latest-run.json.');
console.log('Install browsers: npx playwright install chromium firefox webkit');
console.log('==================================================');

const playwrightArgs = [
  '--timeout=45000',
  ...projectArgs(MATRIX_PROJECTS),
];

console.log(
  `[QA Sentinel] Running Playwright: ${playwrightArgs.join(' ')}`
);

const tests = runPlaywright(playwrightArgs);

if (fail('Playwright matrix', tests) && tests.error) {
  console.error(
    '[QA Sentinel] Install browsers with: npx playwright install chromium firefox webkit'
  );
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
