import { spawnSync } from 'node:child_process';
import process from 'node:process';

console.warn(
  '[QA Sentinel] qa:compat now runs the full browser × device matrix (qa:matrix).'
);

const result = spawnSync(
  process.execPath,
  ['scripts/qa-matrix.mjs', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  }
);

process.exitCode = result.status ?? 1;
