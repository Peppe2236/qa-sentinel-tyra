# QA Sentinel Tyra — system backlog

Honest remaining work to turn this repo into a **serious** QA platform for
`nation.dev` and `aiskills.nation.dev`. This is not a claim that the product is
complete, and it is not marketing copy.

Status values:

- **done** — in this repo now
- **partial** — code or docs exist, coverage or wiring is incomplete
- **not done** — still required

Default shell is Ubuntu on WSL:

```bash
cd /mnt/c/Users/Pette/Downloads/qa-sentinel-tyra-main
```

---

## Priority order

1. Keep typecheck and analyzer unit tests green (CI required gates).
2. Real authenticated E2E on Nation, then AI Skills learning flows.
3. Traceability: every new test annotates requirement + flow IDs.
4. Security / a11y / performance evidence that the analyzers can consume.
5. Dashboard persistence that GitHub can show without committing huge runs.
6. Flake control, observability, optional LLM — after the above is real.

---

## CI/CD and quality gates

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| CI-01 | GitHub Actions workflow | Without CI, GitHub has no proof the suite still typechecks | **done** | Inspect `.github/workflows/qa-ci.yml` |
| CI-02 | Typecheck as a required gate | Reporter TypeScript is the product | **done** | `npm run typecheck` |
| CI-03 | Analyzer unit tests as a required gate | Catalog/config regressions should fail CI without hitting live sites | **done** | `npm run test:unit` |
| CI-04 | Live Nation Chromium in CI | Catches homepage/auth smoke breakage | **partial** | Scheduled / `workflow_dispatch` job runs `npm run qa:sites` (both sites, Chromium) with `continue-on-error`. Not a required gate |
| CI-05 | Live Skills Chromium in CI | Same for the catalog page | **partial** | Covered by the same `qa:sites` job (not a split Nation-only / Skills-only overwrite) |
| CI-06 | Combined Chromium quality job | Split jobs overwrite `playwright-report/`; a single combined run would be a better release artifact | **done** | GitHub `qa-sites` job runs `npm run qa:sites`. Local: `npm run qa:sites` |
| CI-07 | Do not fail the repo on live-site flake | nation.dev is third-party and flaky from GitHub runners | **done** | Live `qa:sites` uses `continue-on-error: true`; required job is typecheck + unit |
| CI-08 | Upload Playwright HTML + reports artifacts | GitHub otherwise looks empty because reports are gitignored | **done** | Workflow uploads `playwright-report/`, `reports/` (including `human-review.html` and `executive-report.pdf`) and `dashboard/data/*.json` |
| CI-09 | Cache Playwright browsers | CI is slow without cache | **done** | `actions/cache` on `~/.cache/ms-playwright` in the `qa-sites` job |
| CI-10 | Branch protection | `main` can still be pushed without green required gates | **docs** | [`docs/BRANCH-PROTECTION.md`](BRANCH-PROTECTION.md) — Petter must enable in GitHub UI; require job `Typecheck and unit tests` |
| CI-11 | PR comment with summary | Artifacts are easy to miss | **done** | `quality` job posts/updates a PR comment from `test-results/unit-results.json` |
| CI-12 | Nightly full matrix | Compatibility projects (Firefox/WebKit/tablet/mobile) are optional locally | **partial** | GitHub nightly is Chromium `qa:sites` only. Full 18-project matrix stays local `npm run qa:unattended` or optional `workflow_dispatch` `run_full_matrix` (120 min, continue-on-error). Fast Chromium: `npm run qa:sites` |
| CI-13 | Fail CI on `test.only` | Already `forbidOnly` when `CI=true` | **done** | `CI=true npm run test:nation:ci` |

---

## Real E2E coverage (Nation)

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| N-01 | Homepage HTTP/title/content/network smoke | Public marketing page is the anonymous entry | **done** | `npx playwright test tests/nation/homepage.spec.ts --project=nation-chromium` |
| N-02 | Homepage join links, theme, legal, copy | User-facing actions exist today | **done** | `npx playwright test tests/nation/basic-user.spec.ts --project=nation-chromium` |
| N-03 | Sign-in / sign-up / reset **forms** | Proves controls render; does not prove login | **done** | `npx playwright test tests/nation/Authentication.spec.ts --project=nation-chromium` |
| N-04 | Real login with a test account | Without a session, /home /jobs /profile stay untested | **partial** | Set `NATION_TEST_*` in `.env`; `qa:unattended` logs in once via storageState. Missing env = one human-pack item |
| N-05 | `storageState` auth setup project | Every spec currently repeats anonymous visits | **done** | `tests/auth/nation.setup.ts` writes `playwright/.auth/nation.json`; member specs reuse it |
| N-06 | Authenticated /home | Discovery redirects anonymous users to /signin | **partial** | Spec exists and **skips** without `NATION_TEST_*` (gap, not a crash). Anonymous redirect is covered by `tests/nation/anonymous-gated.spec.ts` |
| N-07 | Authenticated /jobs | Listed in scan inventory; no member test | **partial** | Same skip + anonymous `/jobs` → `/signin` (jobs listing is not public) |
| N-08 | Authenticated /profile | Same | **partial** | Same skip + anonymous redirect |
| N-09 | Invalid-password error handling | Critical flow scenario `SCN-NATION-SIGNIN-REJECT` is documented only | **done** | Asserts stay on `/signin` with no stack trace |
| N-10 | Session expiry / recovery | Documented as not implemented | **not done** | Expire cookie, expect redirect to /signin |
| N-11 | Partner-join / manifesto / made-with-sweden | Discovered public routes; only HTTP smoke if scan output exists | **done** | `npx playwright test tests/nation/public-pages.spec.ts --project=nation-chromium` |
| N-12 | Cross-browser Nation matrix | Firefox/WebKit/tablet/mobile projects exist locally | **partial** | Daily everything: `npm run qa:unattended`. Fast Chromium: `npm run qa:sites`. Matrix without scan: `npm run qa:matrix` |

---

## Real E2E coverage (AI Skills)

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| S-01 | Catalog page smoke | `/skills` is the public entry | **done** | `npm run test:skills:ci` |
| S-02 | Skill detail pages (gamma, claude, notebooklm) | Only generated HTTP loads, no UI assertions | **partial** | `tests/skills/detail.spec.ts` plus generated scan smoke |
| S-03 | Nested task pages | Scan has task URLs; no “complete task” scenario | **partial** | Generated HTTP smoke after `npm run qa:sites`; no complete-task scenario |
| S-04 | Assessment flow | `/assessment` is a core product path and is untested | **partial** | Anonymous load: public start CTA / landmarks or login redirect, no HTTP 500 (`tests/skills/learn.spec.ts`). Completing the assessment still needs `AI_SKILLS_TEST_*` |
| S-05 | Learning path flow | `/path` untested | **partial** | Same learn spec: public landmarks or redirect; no complete-path scenario |
| S-06 | Practice flow | `/practice` untested | **partial** | Same learn spec: public landmarks or redirect; no complete-practice scenario |
| S-07 | AI Skills sign-in | Scan has marked `/signin` failed; no dedicated spec | **done** | Form coverage in `tests/skills/auth.spec.ts`; login skips without `AI_SKILLS_TEST_*` |
| S-08 | Authenticated Skills session | Same gap as Nation | **partial** | `tests/auth/ai-skills.setup.ts` + `tests/skills/auth-session.spec.ts`; skips without `AI_SKILLS_TEST_*` |
| S-09 | notebooklm network failure | Scan recorded an unexpected failed request | **not done** | Reproduce, classify product vs third-party |

---

## Requirements / traceability

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| R-01 | `requirements/requirements.json` filled from real routes | Empty arrays made M5.2 look complete while coverage was zero | **done** | `npm run test:unit` |
| R-02 | Playwright annotations for requirement IDs | Reporter only creates evidence from annotations | **done** for current specs | See `tests/helpers/quality.ts` |
| R-03 | Acceptance-criteria IDs on tests | Requirement status stays `partially-verified` without them | **done** for current specs | Same |
| R-04 | Catalog includes known **untested** requirements | Honest gaps (real login, jobs, assessment) | **done** | Read `REQ-NATION-AUTH-005`, `REQ-SKILLS-LEARN-001` |
| R-05 | Release-blocking `critical` only where tests exist | Untested critical ACs would mark every run `not-ready` | **done** | Unit test in `tests/unit/quality-catalog.spec.ts` |
| R-06 | Site-filtered requirement assessment | A Nation-only run currently evaluates Skills requirements as not-tested | **done** | `filterCatalogBySites` in the reporter; combined command is `npm run qa:sites` |
| R-07 | Traceability matrix report | Need a single table: requirement → tests → last result | **done** | `reports/traceability.html` from reporter `onEnd`; `npm run report:traceability` |
| R-08 | Ban new specs without annotations | Drift will return | **not done** | Unit test that greps `tests/**/*.spec.ts` |

---

## Critical flows

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| F-01 | `flows/critical-flows.json` filled | Empty flows made M5.3 a hollow score | **done** | `npm run test:unit` |
| F-02 | Flow + scenario annotations on tests | Same evidence path as requirements | **done** for current specs | `qualityMeta({ flow, scenario })` |
| F-03 | Unimplemented scenarios listed, not marked critical | Invalid-login, assessment, session recovery | **done** | Read `FLOW-SKILLS-LEARN` |
| F-04 | Error-handling and recovery scenarios with tests | Catalog has types; almost no tests | **not done** | Add specs, then flip `critical: true` |
| F-05 | Flow coverage in CI summary | Dashboard is local; GitHub PRs cannot see it | **not done** | Publish markdown from reporter |

---

## Security, performance, a11y, UX

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| Q-01 | `config/security-performance.json` thresholds | Empty thresholds left performance `not-verified` | **done** | `npm run test:unit` |
| Q-02 | `requiredChecks` list | Documents intended security areas | **done** | Inspect `config/security-performance.json` |
| Q-03 | Wire `requiredChecks` into `analyzeSecurity` | Config is otherwise unused | **done** | `npm run test:unit` |
| Q-04 | HTTPS / transport assertion | Sites are HTTPS; no explicit test | **done** | Nation homepage and Skills catalog assert `https:`; mixed-content http: requests and http: homepage links fail honestly |
| Q-05 | Security-header checks | HSTS, CSP, X-Frame-Options | **done** | Homepages + sign-in document headers; missing headers fail honestly |
| Q-06 | Cookie flags after login | Session cookies need Secure/HttpOnly/SameSite | **partial** | Anonymous Set-Cookie flags are measured; no cookies = not-observed, not POOR. Login cookies still need N-04 (post-M7 credentials) |
| Q-07 | Page-load metric collection | Threshold `pageLoadMs` exists; observer only fills test-duration p95 | **done** | `npm run qa:sites` — Nation homepage, Nation sign-in, Skills catalog |
| Q-08 | API/backend latency observation | Thresholds exist; values stay `not-verified` | **partial** | First-party XHR/fetch on those pages; none = not-observed, not POOR. No backend APM |
| Q-09 | axe-core accessibility scan | UX/UI areas are mostly `not-verified` | **done** | `@axe-core/playwright` on Nation homepage + Skills catalog; serious/critical fail, moderate and color-contrast log as warnings |
| Q-10 | Keyboard / focus tests | Theme and sidebar are mouse-click only | **done** | `tests/nation/keyboard-a11y.spec.ts` and `tests/skills/keyboard-a11y.spec.ts` — first N Tab stops, no trap; failures are accessibility issues |
| Q-11 | Reduced-motion / contrast | No visual regression or contrast budget | **partial** | Reduced-motion usability is measured on homepage/catalog. Contrast budget and visual regression stay later |
| Q-12 | Lighthouse / Web Vitals | Performance intelligence is test-duration, not UX performance | **partial** | LCP/FCP from PerformanceObserver when the browser exposes them; `npm run qa:lighthouse` writes `reports/lighthouse-*.json` and the reporter attaches notes. CI is `workflow_dispatch` only (not every PR). CLS fail-budgets stay later (CLS is observed, not failed, because it is too flaky) |

---

## Test data, env, secrets

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| E-01 | `.env.example` | New clones had no contract for secrets | **done** | `cp .env.example .env` |
| E-02 | Load `.env` in Playwright config | Credentials otherwise never reach tests | **done** | `playwright.config.ts` `loadLocalEnv` |
| E-03 | `.env` gitignored | Prevent token leaks | **done** | `.gitignore` |
| E-04 | Disposable Nation QA user | Real login cannot use a personal account | **not done** | Create account; put email/password in local `.env` only |
| E-05 | GitHub Actions secrets for optional login | CI cannot run N-04 without secrets | **not done** | Repo secrets `NATION_TEST_EMAIL` / `NATION_TEST_PASSWORD` |
| E-06 | Seed data independent of production | Tests must not create real jobs/profiles | **not done** | Staging environment or feature flags |
| E-07 | No LLM keys in repo | Sentinel AI is not an LLM; fake keys would be theater | **done** | `.env.example` has none |

---

## Page objects / fixtures

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| P-01 | Nation home page object | Specs duplicated URLs and locators | **done** | `tests/pages/nation-home.page.ts` |
| P-02 | Nation auth page object | Same for sign-in/up/reset | **done** | `tests/pages/nation-auth.page.ts` |
| P-03 | Skills catalog page object | Same for `/skills` | **done** | `tests/pages/skills-catalog.page.ts` |
| P-04 | Annotation helper | Keep IDs consistent | **done** | `tests/helpers/quality.ts` |
| P-05 | Env credential helper | Skip real login when unset | **done** | `tests/helpers/env.ts` |
| P-06 | Fixtures: `nationHome`, `nationAuth` | Tests still `new Page()` manually | **not done** | `tests/fixtures/qa.ts` |
| P-07 | Skills detail / assessment page objects | Learning flows will otherwise copy locators | **not done** | Add when S-04 exists |
| P-08 | Generated tests remain shallow | Page-load only; no page objects | **partial** | Acceptable for smoke; do not treat as functional coverage |

---

## Unit tests for reporter / analyzers

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| U-01 | Isolated Playwright unit config | Default reporter would overwrite dashboard JSON | **done** | `playwright.unit.config.ts` |
| U-02 | Requirements / flows / sec-perf contract tests | Empty catalogs must not return unnoticed | **done** | `npm run test:unit` |
| U-03 | Dedup / classifier / diagnostics units | Diagnostics already live under `tests/diagnostics` | **partial** | `npx playwright test tests/diagnostics --project=nation-chromium` |
| U-04 | Unified scoring golden fixtures | Schema v5 regressions are currently manual | **not done** | Check in a tiny `DashboardRun` fixture |
| U-05 | Markdown/HTML report snapshot | Easy to break silently | **not done** | Compare a trimmed fixture |
| U-06 | Coverage of `requiredChecks` once wired | Q-03 needs a unit test | **done** | `npm run test:unit` |

---

## Dashboard persistence / sample data

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| D-01 | Gitignore live `dashboard/data/*.json` | Stops huge runs landing on GitHub | **done** | `.gitignore` |
| D-02 | Committed sample stub | Empty clone + empty GitHub UI | **done** | `npm run dashboard:sample` |
| D-03 | Sample README | Explains generate vs seed | **done** | `dashboard/data/sample/README.md` |
| D-04 | Publish dashboard on GitHub Pages | Private repo; optional internal Pages | **partial** | Workflow `.github/workflows/pages.yml` + `npm run pages:prepare`. Petter must enable Pages (GitHub Actions source). See [`GITHUB-PAGES.md`](GITHUB-PAGES.md) |
| D-05 | History retention policy | `history.json` already grew huge locally | **done** | Last 50 runs (`QA_HISTORY_LIMIT`) in the reporter |
| D-06 | Do not commit `test-results/` or `playwright-report/` | Binary traces | **done** | `.gitignore` |
| D-07 | CI artifact retention | 14 days; not a long-term store | **partial** | Increase or export to S3 later |

---

## Observability and flaky tests

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| O-01 | CI retries=2 | Playwright config already retries on `CI` | **done** | `playwright.config.ts` |
| O-02 | Trace on first retry | Present | **done** | `use.trace: 'on-first-retry'` |
| O-03 | Flake quarantine | Repeated live failures need a quarantine tag, not silent skips | **not done** | `test.fixme` with ticket ID |
| O-04 | Classify third-party vs first-party | GA/Clarity CSP noise is partially filtered | **partial** | Homepage diagnostics vs `utils/diagnostics.ts` still differ |
| O-05 | Unify diagnostic filters | Nation homepage and Skills catalog filter different hosts | **not done** | One helper used by all specs |
| O-06 | Structured run metadata | `GITHUB_SHA` / branch already modeled on `RunMetadata` | **not done** | Fill from env in the reporter |
| O-07 | Alerting | No Slack/email when P0 appears | **not done** | Optional later; not a foundation |

---

## Ubuntu / WSL + VS Code

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| W-01 | LF via `.gitattributes` | Shell/TS/JSON must not pick up CRLF | **done** | `git add --renormalize .` if old files still have CRLF |
| W-02 | `.vscode/settings.json` LF + tab size | VS Code on Windows otherwise writes CRLF | **done** | Open folder in VS Code |
| W-03 | Recommended Playwright + Remote-WSL extensions | Default workflow | **done** | `.vscode/extensions.json` |
| W-04 | Tasks: typecheck, unit, qa:unattended, qa:sites, qa:matrix, dashboard | Avoid memorizing npm scripts | **done** | Terminal → Run Task; daily everything is `qa:unattended`; fast Chromium is `qa:sites`; matrix without scan is `qa:matrix` |
| W-05 | Launch configs | Debug current spec | **done** | Run and Debug |
| W-06 | README Ubuntu section | Path `/mnt/c/Users/Pette/Downloads/qa-sentinel-tyra-main` | **done** | See README |
| W-07 | WSL default terminal profile | May fail if the distro is not named `Ubuntu` | **partial** | Change distro name in `.vscode/settings.json` if needed |
| W-08 | ESLint/Prettier project config | Not used in this repo; not added as fake tooling | **not done** | Only add if you actually adopt them |
| W-09 | `scripts/*.sh` LF | User rule: Unix scripts | **done** | `.gitattributes` `*.sh text eol=lf` |

---

## Sentinel AI / Autonomous QA

| ID | Item | Why | Status | Suggested command |
|---|---|---|---|---|
| A-01 | Keep Autonomous QA advisory-only | Safety contract | **done** | Do not set `executionEnabled: true` |
| A-02 | Heuristic Sentinel AI documented as non-LLM | Avoid implying GPT in the dashboard | **partial** | README still says “Sentinel AI”; backlog is the honest source |
| A-03 | Optional LLM explanations behind a flag | Only after evidence quality is real | **done** | Heuristic always; `SENTINEL_LLM_API_KEY` / `OPENAI_API_KEY` enrich fail-open. Do not add fake API keys |
| A-04 | M7.2 / M7.3 dashboard panels | Already in `dashboard/index.html` | **done** | `npm run dashboard` |
| A-05 | M7.4–M7.6 measured UX/security/performance | Nav, forms, reduced-motion, layout-shift, mixed content, HTTPS links, LCP | **done** | `npm run test:unit`; live: `npm run qa:unattended` |

---

## Out of scope until the above is solid

- Multi-product dashboard for unrelated TYRA Labs apps (Nation + AI Skills in one dashboard is in scope)
- Auto-filing GitHub issues from every P3
- Replacing Playwright with another runner
- Calling this “the best QA system in the world”
