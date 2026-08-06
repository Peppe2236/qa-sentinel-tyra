QA SENTINEL - STEG 3: SMART KLASSIFICERING

ERSÄTT:
C:\Users\Pette\nation-playwright-tests\scripts\scan-site.mjs

MED:
scripts\scan-site.mjs från detta paket.

KÖR SEDAN:
npm run scan:nation

FÖRVÄNTAT RESULTAT:
- Google Analytics som blockeras av CSP blir en WARNING.
- Microsoft Clarity som blockeras av CSP blir en WARNING.
- Sidan räknas fortfarande som användarmässigt fungerande.
- HTTP 4xx/5xx, navigeringsfel, riktiga JS-fel och nätverksfel blir ERROR/CRITICAL.
- discovered-pages.json innehåller både rå logg och klassificerade findings.

EXEMPEL:
[WARN] 200 /benchmarks (... warnings: 2, errors: 0)

I stället för:
[CHECK] 200 /benchmarks
