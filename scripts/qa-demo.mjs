import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = [
  'playwright',
  'test',
  '--project=nation-chromium',
  '--project=ai-skills-chromium',
  '--workers=1',
  '--headed',
];

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

let result;

const isWsl =
  process.platform === 'linux' &&
  Boolean(process.env.WSL_DISTRO_NAME);

if (isWsl) {
  const windowsCwd = execFileSync(
    'wslpath',
    ['-w', process.cwd()],
    { encoding: 'utf8' }
  )
    .trim()
    .replaceAll("'", "''");

  const command = [
    "$ErrorActionPreference = 'Stop'",
    "$env:QA_SENTINEL_RELEASE_SCOPE = 'full'",
    `Set-Location -LiteralPath '${windowsCwd}'`,
    '& npx.cmd playwright test --project=nation-chromium --project=ai-skills-chromium --workers=1 --headed',
    'exit $LASTEXITCODE',
  ].join('; ');

  result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', command],
    {
      stdio: 'inherit',
    }
  );
} else if (process.platform === 'win32') {
  result = spawnSync(
    'cmd.exe',
    [
      '/d',
      '/s',
      '/c',
      'set "QA_SENTINEL_RELEASE_SCOPE=full" && npx.cmd playwright test --project=nation-chromium --project=ai-skills-chromium --workers=1 --headed',
    ],
    {
      stdio: 'inherit',
    }
  );
} else {
  const playwrightCli = fileURLToPath(
    new URL('../node_modules/@playwright/test/cli.js', import.meta.url)
  );

  result = spawnSync(
    process.execPath,
    [
      playwrightCli,
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
    }
  );
}

if (result.error) {
  console.error(
    '[QA Sentinel] Failed to launch the full demo run:',
    result.error.message
  );
  process.exit(1);
}

if (result.signal) {
  console.error(
    `[QA Sentinel] Demo run terminated by signal: ${result.signal}`
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
