import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const test = spawnSync(
  npmCommand,
  ['playwright', 'test'],
  {
    stdio: 'inherit',
    shell: false,
  }
);

const server = spawn(
  process.execPath,
  ['scripts/serve-dashboard.mjs'],
  {
    detached: true,
    stdio: 'ignore',
  }
);

server.unref();

const url = 'http://localhost:4173';

if (process.platform === 'win32') {
  spawn('cmd', ['/c', 'start', '', url], {
    detached: true,
    stdio: 'ignore',
  }).unref();
} else if (process.platform === 'darwin') {
  spawn('open', [url], {
    detached: true,
    stdio: 'ignore',
  }).unref();
} else {
  spawn('xdg-open', [url], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

process.exitCode = test.status ?? 1;
