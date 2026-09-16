const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rawExe = path.join(root, 'dist', 'QA-Sentinel-Tyra.raw.exe');
const finalExe = path.join(root, 'dist', 'QA-Sentinel-Tyra.exe');
const icon = path.join(root, 'dashboard', 'assets', 'qa-sentinel-tyra-compact.ico');
const resedit = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'resedit.cmd' : 'resedit');

function fail(message) {
  console.error(`[QA Sentinel] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(rawExe)) fail('RAW executable is missing. Run npm run build:exe:raw first.');
if (!fs.existsSync(icon)) fail(`Compact icon is missing: ${icon}`);
if (!fs.existsSync(resedit)) fail('resedit-cli is missing. Run npm install --save-dev resedit-cli@3.1.0');

try { fs.rmSync(finalExe, { force: true }); } catch {}

console.log('[QA Sentinel] Applying compact icon without growing the PE resource section...');
const edit = spawnSync(resedit, [
  rawExe,
  finalExe,
  '--no-grow',
  '--icon', `1,${icon}`,
], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
});

if (edit.stdout) process.stdout.write(edit.stdout);
if (edit.stderr) process.stderr.write(edit.stderr);

if (edit.status !== 0 || !fs.existsSync(finalExe)) {
  console.warn('[QA Sentinel] Icon injection was not safe. Falling back to the verified RAW executable.');
  fs.copyFileSync(rawExe, finalExe);
  console.log('[QA Sentinel] Final EXE created without custom embedded icon.');
  process.exit(0);
}

console.log('[QA Sentinel] Running executable smoke test...');
const verify = spawnSync(finalExe, ['--check'], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
  timeout: 30000,
});

const verifyText = `${verify.stdout || ''}\n${verify.stderr || ''}`;
const corrupted = verify.status !== 0 || /Pkg:\s*Error reading from file/i.test(verifyText);

if (corrupted) {
  console.warn('[QA Sentinel] Post-processed EXE failed verification. Restoring RAW executable as final EXE.');
  try { fs.rmSync(finalExe, { force: true }); } catch {}
  fs.copyFileSync(rawExe, finalExe);

  const fallbackVerify = spawnSync(finalExe, ['--check'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });

  if (fallbackVerify.status !== 0) {
    if (fallbackVerify.stdout) process.stdout.write(fallbackVerify.stdout);
    if (fallbackVerify.stderr) process.stderr.write(fallbackVerify.stderr);
    fail('Even the RAW fallback did not pass --check.');
  }

  console.log('[QA Sentinel] Final EXE restored from verified RAW build.');
  process.exit(0);
}

console.log('[QA Sentinel] Final EXE passed --check with the embedded Tyra icon.');
