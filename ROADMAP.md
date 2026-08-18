# QA Sentinel Tyra Roadmap

## Current state

QA Sentinel Tyra has completed the **Milestone 5 Quality Intelligence Framework**, the **Milestone 6 Advisory Autonomous QA Framework**, and **Milestone 7 Unified Dashboard Intelligence & Operationalization**.

Earlier foundations — Playwright reporting, Deep Discovery, actionable issue consolidation and the Quality Command Center — provide the evidence consumed by these frameworks.

After Milestone 6, Sentinel AI was bound to the live dashboard and positive first-party API/backend verification evidence was integrated into canonical release readiness. These are verified post-M6 enhancements and do not retroactively change the completed M5–M6 scope.

## Decision authority and safety boundaries

- Unified Decisioning is the canonical release authority for dashboard schema v5.
- `releaseDecisionSource: 'unified-v5'` identifies the canonical decision path.
- The legacy release assessment remains available only as comparison telemetry.
- Autonomous QA is advisory-only: execution, remediation authorization and automatic release-decision updates remain intentionally disabled.
- Existing Unified Decision, P0–P4 priority and evidence semantics are reused; no competing weighted score is introduced.

## Milestone 5 – Quality Intelligence Framework ✅ COMPLETE

**Completed: 2026-08-13**

| Delivery | Completed capability |
|---|---|
| 5.1 Quality Intelligence Foundation | Shared evidence, assessment and quality-dimension foundation |
| 5.2 Requirements & Functionality Intelligence | Requirement and acceptance-criteria coverage intelligence |
| 5.3 Critical Flows Intelligence | Critical-flow and scenario coverage intelligence |
| 5.4 UX/UI Intelligence | User-experience and interface quality assessment |
| 5.5 Security & Performance Intelligence | Security and performance assessment |
| 5.6 Compatibility Intelligence | Browser, profile and compatibility assessment |
| 5.7 API & Backend Intelligence | API and backend issue intelligence |
| 5.8 Cross-layer Correlation | Evidence correlation across quality layers |
| 5.9 Unified Scoring & Decisioning | Canonical schema-v5 release assessment |

Unified Decisioning is the canonical schema-v5 release authority. Legacy release assessment remains available as comparison telemetry.

**Milestone 5:** ✅ COMPLETE

## Milestone 6 – Advisory Autonomous QA Framework ✅ COMPLETE

**Completed: 2026-08-17**

| Delivery | Completed advisory capability |
|---|---|
| 6.1 Advisory Autonomous QA Foundation | Advisory assessment, provenance and candidate-action model |
| 6.2 Risk-based Test Selection | Logical-test candidates based on existing risk, Unified Decision and provenance |
| 6.3 Advisory Execution Planning | Ordered phases and advisory test steps; execution remains disabled |
| 6.4 Advisory Failure Reproduction | Evidence-linked reproduction recipes for failed current-run tests |
| 6.5 Advisory Verification Planning | Verification plans remain `awaiting-new-evidence` |
| 6.6 Advisory Change Impact Analysis | Potential change impact without claiming confirmation |
| 6.7 Advisory Quality Drift Comparison | Pairwise comparison with the latest prior canonical schema-v5 run; `no-baseline` when unavailable |
| 6.8 Advisory Investigation Planning | Investigation cases and unconfirmed hypotheses for changed or potential-regression signals |

### Milestone 6 safety contract

- `executionEnabled: false`
- advisory actions and plans use `executable: false`
- analyzers launch no Playwright tests or shell commands
- remediation is not authorized or applied
- release decisions are not automatically updated
- verification requires new evidence
- potential impact, drift and root cause remain unconfirmed

**Milestone 6:** ✅ COMPLETE

## Verified post-M6 enhancements

**Validated: 2026-08-17**

| Enhancement | Verified result |
|---|---|
| Sentinel AI dashboard binding | Live confidence, risk, priority, findings, summary, root cause, impact, recommendation and next action |
| Positive API/backend evidence | Successful same-origin `document`, `fetch` and `xhr` metadata can establish verified health |
| Evidence privacy guard | Credentials, query strings, fragments and response bodies are not retained |
| Conservative health semantics | Zero findings without positive evidence remains `not-verified` |
| Full configured QA matrix | 175 tests; 152 passed; 23 failed; 96% health |
| API/backend validation | Healthy; 22 endpoints; 2 services; 47 positive evidence records; zero release gaps |
| Compatibility validation | Configured coverage complete with zero release gaps; real failures remain visible as `degraded` |
| Safety boundary | Autonomous QA remains advisory-only with `executionEnabled: false` |

## Remaining planned work

The long-term product still needs real authenticated E2E depth, optional GitHub
Pages, in-CI full-matrix runtime, keyboard a11y, a scheduled Lighthouse job,
persistence beyond gitignored artifacts and (optionally) an LLM. Those items live in
[`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md). They are not silently
treated as completed by Milestone 5, 6 or 7.

| Capability | Status | Direction |
|---|---|---|
| AI-assisted root-cause intelligence | ✅ Done | Heuristic notes always (theme, copy, headers); LLM enriches per failing test when `SENTINEL_LLM_API_KEY` / `OPENAI_API_KEY` is set and fails open |
| Unified dashboard intelligence | ✅ Done | One Control Center + quality dashboard consumes unified scoring, discovery provenance, both sites, advisory, remediation, human review and the executive PDF |
| Discovery-aware release readiness | ✅ Done | After `qa:unattended` / `qa:sites`, M7.3 counters read discovery JSON + scan inventory, not only generated route tests |
| GitHub Actions integration | ✅ Done | Typecheck and analyzer unit tests are required on push/PR. Scheduled / `workflow_dispatch` runs `qa:sites` (Chromium, both sites) and uploads artifacts with `continue-on-error`. Playwright browser cache is enabled. Full 18-project matrix is local `qa:unattended` |
| Dashboard sample data | ✅ Foundation | `npm run dashboard:sample` seeds a tiny stub; live JSON stays gitignored |
| Requirements and critical-flow catalogs | ✅ Foundation | JSON catalogs exist and tests annotate IDs; many flows are still not-tested |
| PDF executive reports | ✅ Done | `reports/executive-report.pdf` after reporter `onEnd` (verdict, counts, top issues, human queue) |
| Multi-project dashboard | ✅ Done | `config/projects.json` — Nation and AI Skills as two projects in one dashboard (not multiple GitHub repos) |

## Ubuntu + VS Code workflow

Default development is **Ubuntu on WSL** plus **VS Code** (Remote - WSL).

```bash
cd /mnt/c/Users/Pette/Downloads/qa-sentinel-tyra-main
cp .env.example .env
npm install
npx playwright install chromium firefox webkit
npm run typecheck
npm run test:unit
npm run qa:unattended
npm run dashboard
```

Executive PDF (written by the reporter `onEnd`, not a separate consultancy export):

```bash
npm run qa:sites
# or: npm run qa:unattended
ls -l reports/executive-report.pdf
# with the dashboard running:
# http://127.0.0.1:4173/reports/executive-report.pdf
xdg-open reports/executive-report.pdf
```

Daily everything (scan + 18-project matrix + analyzers + human pack):

```bash
npx playwright install chromium firefox webkit
npm run qa:unattended
```

Fast Chromium-only alias (Firefox/Safari/tablet/mobile stay not-in-this-run):

```bash
npm run qa:sites
```

Matrix without a fresh scan:

```bash
npm run qa:matrix
```

`qa:browsers` and `qa:compat` alias `qa:matrix`. Microsoft Edge is covered by Chromium. No `NATION_TEST_*` credentials are required.

Shared editor defaults live in `.vscode/` (LF endings, Playwright extension,
tasks). Details: README “Ubuntu / WSL and VS Code”.

## Unattended run + human review pack

The default unattended command is `npm run qa:unattended`: bounded scan of both
sites, the full 18-project browser × device matrix, every reporter analyzer,
and the human-review pack. It never prompts.

`qa:sites` is the fast Chromium-only alias. `qa:matrix` is the 18-project
matrix without a fresh scan.

After each run the reporter writes `reports/human-review.html` (and `.md`)
and `reports/executive-report.pdf`:

- **GO / WARN / NO-GO** plus three bullets
- **Do not touch** — machine-owned product/content/header/a11y/performance and analyzer findings
- **Needs a human (max ~7)** — credentials or ambiguous investigation only
- **Untested routes** — discovery vs hand-written E2E

Missing test accounts become one queue item, not a crash. Traces and failure
videos are retained. The dashboard Control Center links to the pack.

## Activated vs still policy-disabled (2026-08-18)

| Previously inactive / optional | Now |
|---|---|
| `qa:unattended` was Chromium-only (`qa:sites`) | **Runs** scan + full 18-project matrix |
| Firefox / WebKit / tablet / mobile compatibility cards | **Measured** after `qa:unattended`; Chromium-only runs say run `qa:unattended` |
| Deep Discovery crawl + diagnostics excluded by file-path filters | **Run** on daily Chromium via testMatch |
| Human review pack test-failures only | **Includes** discovery / API / backend analyzer findings |
| Settings Control Center looked unused | **Active** read-only page with policy flags |
| Sentinel AI looked like a closed LLM product | Heuristic **always runs**; UI says **LLM off — no key** when no key |
| Autonomous QA “intentionally disabled” copy | UI says **disabled by policy** (`QA_AUTONOMOUS_EXECUTION`) |
| Local remediation / release-update reports | **Writes** `reports/remediation.md` and `reports/release-status.json` (not production) |
| First-party cookie/consent clicking | **On** for nation.dev and aiskills.nation.dev |

| Still off by policy (not Coming Soon) | Flag / reason |
|---|---|
| Autonomous execution / Playwright launched by the advisor | `QA_AUTONOMOUS_EXECUTION` — even if set, production writes are not implemented |
| Production mutation / nation.dev writes | Never enabled |
| Paid iframe captcha solver | Off unless `SENTINEL_CAPTCHA_SOLVER_KEY` (first-party hosts only) |
| GitHub issue creation | Off unless `QA_CREATE_ISSUES=1` and `GH_TOKEN` / `GITHUB_TOKEN` |
| LLM enrichment | `SENTINEL_LLM_API_KEY` or `OPENAI_API_KEY`; without a key heuristic still runs |
| Auth member routes | Skip without `NATION_TEST_*` / `AI_SKILLS_TEST_*`; one human-queue item |
| PDF executive reports | After each run: `reports/executive-report.pdf` (also `http://127.0.0.1:4173/reports/executive-report.pdf`) |

`qa:full` (`scan:all` + default Playwright, then opens the dashboard) stays a
separate helper. `npm run sentinel` is interactive Nation-headed, not unattended.

## Milestone 7 – Unified Dashboard Intelligence & Operationalization ✅ COMPLETE

**Completed: 2026-08-18**

Earlier docs marked Milestone 7 as “not started”, then “in progress”. Deliveries 7.1–7.8 are implemented: operational npm commands, the advisory Autonomous QA dashboard, discovery-aware release-readiness provenance, measured UX/security/performance evidence, heuristic+LLM root-cause notes, the executive PDF, two-project overview, and documented operationalization.

| Delivery | Status | Completed capability |
|---|---|---|
| 7.1 Operational Test Orchestration | ✅ Done | `qa:unattended` is scan + 18-project matrix; `qa:sites` is Chromium-fast; `qa:matrix` is matrix without scan |
| 7.2 Unified Advisory Dashboard | ✅ Done | Control Center + Autonomous QA panel bind `autonomousQaAssessment`, human review, remediation, discovery, both sites and the PDF — no empty Coming Soon stubs |
| 7.3 Discovery-aware Release Readiness | ✅ Done | Discovery provenance panel reads `discoveryReadiness` from discovery JSON + scan inventory; counters populate after `qa:unattended` / `qa:sites` |
| 7.4 UX/UI Verification Coverage | ✅ Done | axe-core smoke plus measured nav, forms, reduced-motion, layout-shift observation and current-matrix viewport chrome, annotated `ux-ui` and bound to the UX panel. Absence of layout-shift APIs is not-observed, not poor |
| 7.5 Security Verification Coverage | ✅ Done | Header/cookie Playwright checks, mixed-content http: requests, HTTPS-only homepage/catalog links; analyzer consumes `config/security-performance.json`. Anonymous Set-Cookie flags remain not-observed when none are set |
| 7.6 Performance Verification Coverage | ✅ Done | Page-load and first-party API timing plus LCP/FCP from PerformanceObserver when the browser exposes them; LCP uses `pageLoadMs`. Not-observed LCP is not poor. Navigation timing remains the page-load bar |
| 7.7 Evidence-grounded Root-cause Intelligence | ✅ Done | Heuristic notes always (theme, copy, headers); LLM enriches when a key is set and fails open |
| 7.8 Milestone Validation & Documentation | ✅ Done | ROADMAP lists activated vs policy-disabled; nightly GitHub `qa:sites` (Chromium); local `qa:unattended` is the full 18-matrix. GitHub Pages dashboard publish and in-CI 18-matrix stay post-M7 |

### Milestone 7 authority and safety contract

- Unified Decisioning v5 remains the only canonical release authority.
- Milestone 7 introduces no competing weighted score.
- Autonomous test execution remains disabled by policy and advisory-only.
- Remediation authorization and automatic release-decision updates remain disabled by policy.
- Test commands are launched only by an explicit developer or CI action.
- Positive health requires current, relevant evidence; absence of findings is never sufficient.
- First-party evidence remains sanitized and source provenance remains visible.
- Compatibility failures, promoted issues and uncertainty must not be hidden by positive evidence.

**Milestone 7:** ✅ COMPLETE — leftovers that need credentials, repo admin, or a scheduled Lighthouse job live in [`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md) as post-M7 work, not silent gaps inside 7.1–7.8.
