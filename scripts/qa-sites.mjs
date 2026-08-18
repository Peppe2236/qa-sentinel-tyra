import process from 'node:process';

import {
  DAILY_CHROMIUM_PROJECTS,
  ensureScanLimit,
  fail,
  projectArgs,
  runPlaywright,
  scanNation,
  scanSkills,
} from './qa-cli.mjs';

const nationOnly = process.argv.includes('--nation-only');
const skillsOnly = process.argv.includes('--skills-only');

ensureScanLimit();

const scanNationSite = !skillsOnly;
const scanSkillsSite = !nationOnly;
const projects = nationOnly
  ? ['nation-chromium']
  : skillsOnly
    ? ['ai-skills-chromium']
    : [...DAILY_CHROMIUM_PROJECTS];

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — Chromium-only fast run');
console.log('==================================================');
console.log(`QA_MAX_PAGES=${process.env.QA_MAX_PAGES}`);
console.log(
  scanNationSite && scanSkillsSite
    ? 'Sites: nation.dev + aiskills.nation.dev'
    : scanNationSite
      ? 'Sites: nation.dev'
      : 'Sites: aiskills.nation.dev'
);
console.log(
  'Fast alias. Compatibility Firefox/Safari/tablet/mobile stay not-in-this-run.'
);
console.log('For every browser and device: npm run qa:unattended');
console.log('==================================================');

if (scanNationSite) {
  if (fail('Nation scan', scanNation())) {
    process.exit(process.exitCode ?? 1);
  }
}

if (scanSkillsSite) {
  if (fail('AI Skills scan', scanSkills())) {
    process.exit(process.exitCode ?? 1);
  }
}

const playwrightArgs = projectArgs(projects);

console.log(
  `[QA Sentinel] Running Playwright Chromium: ${playwrightArgs.join(' ')}`
);
console.log(
  '[QA Sentinel] No file-path filter: daily Chromium testMatch includes handwritten, discovery, diagnostics and generated smoke.'
);

const tests = runPlaywright(playwrightArgs);

if (tests.error) {
  console.error('[QA Sentinel] Playwright could not be started.');
  console.error(`[QA Sentinel] ${tests.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = tests.status ?? 1;
}

console.log('');
console.log(
  '[QA Sentinel] One dashboard run was written to dashboard/data/latest-run.json.'
);
console.log('[QA Sentinel] Human review pack: reports/human-review.html');
console.log('[QA Sentinel] Executive PDF: reports/executive-report.pdf');
console.log('[QA Sentinel] Open it with: npm run dashboard');
console.log('==================================================');
