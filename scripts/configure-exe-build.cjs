const fs = require('node:fs');

const p = JSON.parse(
  fs.readFileSync('package.json', 'utf8')
);

p.scripts['build:exe:raw'] =
  'pkg scripts/qa-sentinel-launcher.cjs --targets node20-win-x64 --output dist/QA-Sentinel-Tyra.raw.exe';

p.scripts['build:exe:icon'] =
  'resedit dist/QA-Sentinel-Tyra.raw.exe dist/QA-Sentinel-Tyra.exe --icon 1,dashboard/assets/qa-sentinel-tyra.ico --company-name "TYRA Labs" --file-description "QA Sentinel Tyra Workbench" --product-name "QA Sentinel Tyra" --file-version 1.0.0.0 --product-version 1.0.0.0 --original-filename "QA-Sentinel-Tyra.exe"';

p.scripts['build:exe'] =
  'npm run build:exe:raw && npm run build:exe:icon';

fs.writeFileSync(
  'package.json',
  JSON.stringify(p, null, 2) + '\n'
);

console.log('QA Sentinel Tyra EXE build scripts updated.');
