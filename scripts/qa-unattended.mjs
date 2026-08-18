import process from 'node:process';

import {
  DAILY_CHROMIUM_PROJECTS,
  ensureScanLimit,
  fail,
  MATRIX_PROJECTS,
  projectArgs,
  runPlaywright,
  scanNation,
  scanSkills,
} from './qa-cli.mjs';

ensureScanLimit();

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — unattended everything run');
console.log('==================================================');
console.log('No prompts. No captcha clicking. No production writes.');
console.log('Scan both sites + full 18-project browser × device matrix.');
console.log(
  'Hand-written tests: both sites × Chromium/Firefox/WebKit × desktop/tablet/mobile.'
);
console.log(
  'Generated discovery smoke, Deep Discovery crawl and diagnostics stay on daily Chromium only.'
);
console.log(
  `Projects: ${MATRIX_PROJECTS.length} (${DAILY_CHROMIUM_PROJECTS.join(', ')} plus 16 matrix projects).`
);
console.log('Needs: npx playwright install chromium firefox webkit');
console.log('If NATION_TEST_* / AI_SKILLS_TEST_* exist, member routes run via storageState.');
console.log('If they are missing, they are skipped and listed once in the human pack.');
console.log('qa:sites remains the fast Chromium-only alias.');
console.log('==================================================');

if (fail('Nation scan', scanNation())) {
  process.exit(process.exitCode ?? 1);
}

if (fail('AI Skills scan', scanSkills())) {
  process.exit(process.exitCode ?? 1);
}

const playwrightArgs = [
  '--timeout=45000',
  ...projectArgs(MATRIX_PROJECTS),
];

console.log(
  `[QA Sentinel] Running Playwright matrix: ${playwrightArgs.join(' ')}`
);

const tests = runPlaywright(playwrightArgs);

if (tests.error) {
  console.error('[QA Sentinel] Playwright could not be started.');
  console.error(tests.error.message);
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
console.log('[QA Sentinel] Human review pack:');
console.log('  reports/human-review.html');
console.log('  reports/human-review.md');
console.log('  reports/executive-report.pdf');
console.log('Open with the dashboard: http://127.0.0.1:4173/reports/human-review.html');
console.log('==================================================');
