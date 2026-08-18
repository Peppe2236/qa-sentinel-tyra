# Sample dashboard data

Git ignores live files under `dashboard/data/*.json` so GitHub does not fill up
with Playwright output. A fresh clone therefore looks empty until you either
run tests or seed this sample.

## Generate real data (preferred)

From Ubuntu/WSL:

```bash
cd /mnt/c/Users/Pette/Downloads/qa-sentinel-tyra-main
npm install
npx playwright install chromium
npm run test:nation:ci
npm run dashboard
```

Then open http://127.0.0.1:4173/

The reporter writes:

- `dashboard/data/latest-run.json`
- `dashboard/data/history.json`
- `dashboard/data/issues.json`
- `dashboard/data/unified-issues.json`

Do not commit those files, `test-results/`, or `playwright-report/`.

## Seed the tiny sample (GitHub / empty clone)

```bash
npm run dashboard:sample
npm run dashboard
```

The sample is a 3-test stub. It is not a release baseline and must not be used
as evidence that Nation or AI Skills is healthy.

GitHub Pages uses the same stub (`npm run pages:prepare` in
`.github/workflows/pages.yml`). Enable Pages once: Settings → Pages → Source
GitHub Actions. See [`docs/GITHUB-PAGES.md`](../../../docs/GITHUB-PAGES.md).
