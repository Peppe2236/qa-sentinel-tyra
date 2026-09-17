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

function runCheck(exe) {
  const result = spawnSync(exe, ['--check'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  const text = `${result.stdout || ''}\n${result.stderr || ''}`;
  return {
    ok: result.status === 0 && !/Pkg:\s*Error reading from file/i.test(text),
    result,
    text,
  };
}

function patchGuiSubsystem(exePath) {
  const buffer = fs.readFileSync(exePath);
  if (buffer.length < 0x100 || buffer.toString('ascii', 0, 2) !== 'MZ') {
    throw new Error('Not a valid PE executable (missing MZ header).');
  }

  const peOffset = buffer.readUInt32LE(0x3c);
  if (peOffset + 4 + 20 + 70 > buffer.length) {
    throw new Error('Invalid PE header offset.');
  }

  if (buffer.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
    throw new Error('Not a valid PE executable (missing PE signature).');
  }

  const optionalHeader = peOffset + 4 + 20;
  const magic = buffer.readUInt16LE(optionalHeader);
  if (magic !== 0x10b && magic !== 0x20b) {
    throw new Error(`Unsupported PE optional-header magic: 0x${magic.toString(16)}`);
  }

  // IMAGE_OPTIONAL_HEADER.Subsystem is WORD at +0x44 for PE32 and PE32+.
  // 2 = IMAGE_SUBSYSTEM_WINDOWS_GUI, 3 = WINDOWS_CUI.
  const subsystemOffset = optionalHeader + 0x44;
  const previous = buffer.readUInt16LE(subsystemOffset);
  buffer.writeUInt16LE(2, subsystemOffset);
  fs.writeFileSync(exePath, buffer);
  return previous;
}

if (!fs.existsSync(rawExe)) fail('RAW executable is missing. Run npm run build:exe:raw first.');
if (!fs.existsSync(icon)) fail(`Compact icon is missing: ${icon}`);
if (!fs.existsSync(resedit)) fail('resedit-cli is missing. Run npm install --save-dev resedit-cli@3.1.0');

const rawCheck = runCheck(rawExe);
if (!rawCheck.ok) {
  if (rawCheck.result.stdout) process.stdout.write(rawCheck.result.stdout);
  if (rawCheck.result.stderr) process.stderr.write(rawCheck.result.stderr);
  fail('RAW executable did not pass --check.');
}

try { fs.rmSync(finalExe, { force: true }); } catch {}

console.log('[QA Sentinel] Applying Tyra icon with --no-grow...');
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

let iconApplied = edit.status === 0 && fs.existsSync(finalExe);
if (!iconApplied) {
  console.warn('[QA Sentinel] Safe icon injection was unavailable; using RAW payload as fallback.');
  fs.copyFileSync(rawExe, finalExe);
}

let preGuiCheck = runCheck(finalExe);
if (!preGuiCheck.ok) {
  console.warn('[QA Sentinel] Icon candidate failed verification; restoring RAW payload.');
  fs.copyFileSync(rawExe, finalExe);
  iconApplied = false;
  preGuiCheck = runCheck(finalExe);
  if (!preGuiCheck.ok) fail('Fallback payload failed verification before desktop-mode patch.');
}

console.log('[QA Sentinel] Switching final EXE from console subsystem to Windows desktop GUI subsystem...');
let previousSubsystem;
try {
  previousSubsystem = patchGuiSubsystem(finalExe);
} catch (error) {
  fail(`Could not enable desktop GUI subsystem: ${error.message}`);
}

const finalCheck = runCheck(finalExe);
if (!finalCheck.ok) {
  if (finalCheck.result.stdout) process.stdout.write(finalCheck.result.stdout);
  if (finalCheck.result.stderr) process.stderr.write(finalCheck.result.stderr);
  fail('Desktop-mode EXE failed --check after GUI subsystem patch.');
}

console.log(`[QA Sentinel] Desktop EXE verified. Subsystem ${previousSubsystem} -> 2 (GUI).`);
console.log(`[QA Sentinel] Custom icon: ${iconApplied ? 'yes' : 'fallback/default'}.`);
console.log('[QA Sentinel] Double-click now starts Workbench without a persistent console window.');
