# GitHub Pages (sample dashboard)

The workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
publishes the static `dashboard/` folder with **sanitized sample JSON**
(`dashboard/data/sample/`). It does **not** commit `.env`, live
`dashboard/data/*.json`, `test-results/`, or `playwright-report/`.

GitHub will not serve the site until Pages is enabled once.

## Exact GitHub UI steps

1. Open [https://github.com/Peppe2236/qa-sentinel-tyra](https://github.com/Peppe2236/qa-sentinel-tyra).
2. **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, choose **GitHub Actions**.
4. Save.
5. Open **Actions** → **Deploy GitHub Pages dashboard** → **Run workflow**.
6. After the `github-pages` environment deploys, the URL is shown on the
   workflow summary (typically
   `https://peppe2236.github.io/qa-sentinel-tyra/`).

Until step 3 is done, `actions/deploy-pages` fails. That failure is expected
and does not affect typecheck/unit CI.

## What visitors see

The sample banner on `dashboard/index.html` makes it obvious this is the
committed stub, not a live `qa:sites` run. To refresh the public snapshot
after dashboard CSS/JS changes, push to `main` (path filter on `dashboard/**`)
or run the workflow manually.

Local equivalent:

```bash
npm run pages:prepare
npm run dashboard
```
