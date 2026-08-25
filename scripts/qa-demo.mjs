import { spawnSync } from 'node:child_process';

console.log('');
console.log('==================================================');
console.log('        QA SENTINEL TYRA - FULL DEMO RUN');
console.log('==================================================');
console.log('Release scope: FULL');
console.log('Projects: Nation + AI Skills');
console.log('Workers: 1');
console.log('Mode: headed');
console.log('==================================================');
console.log('');

const command =
  process.platform === 'win32'
    ? 'npx.cmd'
    : 'npx';

const result = spawnSync(
  command,
  [
    'playwright',
    'test',
    '--project=nation-chromium',
    '--project=ai-skills-chromium',
    '--workers=1',
    '--headed',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      QA_SENTINEL_RELEASE_SCOPE: 'full',
    },
    shell: false,
  }
);

if (result.error) {
  console.error(
    '[QA Sentinel] Failed to launch the full demo run:',
    result.error.message
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
