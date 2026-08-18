import { spawnSync } from 'node:child_process';
import process from 'node:process';

const nationOnly = process.argv.includes('--nation-only');
const skillsOnly = process.argv.includes('--skills-only');

if (!process.env.QA_MAX_PAGES) {
  process.env.QA_MAX_PAGES = '20';
}

function runNode(script, args = []) {
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

function fail(label, result) {
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

const scanNation = !skillsOnly;
const scanSkills = !nationOnly;

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — bounded site scan + tests');
console.log('==================================================');
console.log(`QA_MAX_PAGES=${process.env.QA_MAX_PAGES}`);
console.log(
  scanNation && scanSkills
    ? 'Sites: nation.dev + aiskills.nation.dev'
    : scanNation
      ? 'Sites: nation.dev'
      : 'Sites: aiskills.nation.dev'
);
console.log('==================================================');

if (scanNation) {
  console.log('[QA Sentinel] Scanning https://nation.dev/ (bounded)...');
  const scan = runNode('scripts/scan-site.mjs', [
    'https://nation.dev/',
    'nation',
  ]);

  if (fail('Nation scan', scan)) {
    process.exit(process.exitCode ?? 1);
  }
}

if (scanSkills) {
  console.log(
    '[QA Sentinel] Scanning https://aiskills.nation.dev/skills (bounded)...'
  );
  const scan = runNode('scripts/scan-site.mjs', [
    'https://aiskills.nation.dev/skills',
    'ai-skills',
  ]);

  if (fail('AI Skills scan', scan)) {
    process.exit(process.exitCode ?? 1);
  }
}

const playwrightArgs = nationOnly
  ? [
      'tests/nation',
      'tests/auth/nation.setup.ts',
      'tests/generated/discovered-pages-nation.spec.ts',
      '--project=nation-chromium',
    ]
  : skillsOnly
    ? [
        'tests/skills',
        'tests/auth/ai-skills.setup.ts',
        'tests/generated/discovered-pages-ai-skills.spec.ts',
        '--project=ai-skills-chromium',
      ]
    : [
        'tests/nation',
        'tests/skills',
        'tests/auth',
        'tests/generated',
        '--project=nation-chromium',
        '--project=ai-skills-chromium',
      ];

console.log(
  `[QA Sentinel] Running Playwright: ${playwrightArgs.join(' ')}`
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
console.log(
  '[QA Sentinel] Human review pack: reports/human-review.html'
);
console.log('[QA Sentinel] Open it with: npm run dashboard');
console.log('==================================================');
