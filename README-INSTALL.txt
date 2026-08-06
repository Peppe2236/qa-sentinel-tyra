QA SENTINEL - STEG 2: WEBSITE SCANNER

KOPIERA FILERNA:
scripts\scan-site.mjs
tests\discovered-pages.spec.ts

TILL:
C:\Users\Pette\nation-playwright-tests

LÄGG TILL I PACKAGE.JSON UNDER "scripts":

"scan": "node scripts/scan-site.mjs",
"scan:nation": "node scripts/scan-site.mjs https://nation.dev/",
"scan:skills": "node scripts/scan-site.mjs https://aiskills.nation.dev/skills",
"qa:full": "npm run scan:nation && npm run qa"

Ditt scripts-block kan exempelvis vara:

"scripts": {
  "test": "playwright test",
  "qa": "node scripts/run-qa.mjs",
  "qa:full": "npm run scan:nation && npm run qa",
  "scan": "node scripts/scan-site.mjs",
  "scan:nation": "node scripts/scan-site.mjs https://nation.dev/",
  "scan:skills": "node scripts/scan-site.mjs https://aiskills.nation.dev/skills",
  "dashboard": "node scripts/serve-dashboard.mjs",
  "report": "playwright show-report"
}

KÖR FÖRST:
npm run scan:nation

Kontrollera att denna fil skapas:
dashboard\data\discovered-pages.json

KÖR SEDAN:
npx playwright test tests/discovered-pages.spec.ts --project=chromium

När detta fungerar:
npm run qa:full

VIKTIGT:
Scannern följer bara interna länkar på samma origin.
Den hoppar över API-rutter, logout-länkar och vanliga mediefiler.
Standardgränsen är 50 sidor.

Ändra till exempel gränsen i PowerShell:
$env:QA_MAX_PAGES=100
npm run scan:nation
