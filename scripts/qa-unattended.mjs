import { spawnSync } from 'node:child_process';
import process from 'node:process';

function runNode(script) {
  if (process.platform === 'win32') {
    const command = process.env.ComSpec ?? 'cmd.exe';

    return spawnSync(
      command,
      ['/d', '/s', '/c', `node ${script}`],
      {
        stdio: 'inherit',
        shell: false,
        env: process.env,
      }
    );
  }

  return spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

console.log('');
console.log('==================================================');
console.log('  QA Sentinel Tyra — unattended run');
console.log('==================================================');
console.log('No prompts. No captcha clicking. No production writes.');
console.log('Same work as qa:sites: bounded scan + Chromium + reporter.');
console.log('If NATION_TEST_* / AI_SKILLS_TEST_* exist, member routes run via storageState.');
console.log('If they are missing, they are skipped and listed once in the human pack.');
console.log('qa:matrix is extra (18 projects), still unattended, slower.');
console.log('==================================================');

const result = runNode('scripts/qa-sites.mjs');

if (result.error) {
  console.error('[QA Sentinel] Unattended run could not start.');
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}

console.log('');
console.log('[QA Sentinel] Human review pack:');
console.log('  reports/human-review.html');
console.log('  reports/human-review.md');
console.log('Open with the dashboard: http://127.0.0.1:4173/reports/human-review.html');
console.log('Or from the repo: reports/human-review.html');
console.log('==================================================');
