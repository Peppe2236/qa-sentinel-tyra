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
  console.log(`[QA Sentinel] Pages snapshot: dashboard/data/${toName}`);
}

const noJekyll = path.join(projectRoot, 'dashboard', '.nojekyll');
fs.writeFileSync(noJekyll, '', 'utf8');

console.log(
  '[QA Sentinel] GitHub Pages artifact uses sanitized sample dashboard data.'
);
console.log(
  '[QA Sentinel] Live dashboard/data/*.json stays gitignored. Enable Pages in GitHub settings (Actions source).'
);
