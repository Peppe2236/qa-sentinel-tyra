import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const sampleDirectory = path.join(
  projectRoot,
  'dashboard',
  'data',
  'sample'
);

const dataDirectory = path.join(
  projectRoot,
  'dashboard',
  'data'
);

const copies = [
  ['latest-run.sample.json', 'latest-run.json'],
  ['history.sample.json', 'history.json'],
  ['issues.sample.json', 'issues.json'],
  ['unified-issues.sample.json', 'unified-issues.json'],
];

fs.mkdirSync(dataDirectory, { recursive: true });

for (const [fromName, toName] of copies) {
  const fromPath = path.join(sampleDirectory, fromName);
  const toPath = path.join(dataDirectory, toName);

  if (!fs.existsSync(fromPath)) {
    throw new Error(`Missing sample file: ${fromPath}`);
  }

  fs.copyFileSync(fromPath, toPath);
  console.log(`[QA Sentinel] Wrote dashboard/data/${toName}`);
}

console.log(
  '[QA Sentinel] Sample dashboard data is in place. Run: npm run dashboard'
);
