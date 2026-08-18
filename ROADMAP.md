# QA Sentinel Tyra Roadmap

## Current state

QA Sentinel Tyra has completed both the **Milestone 5 Quality Intelligence Framework** and the **Milestone 6 Advisory Autonomous QA Framework**.

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

The long-term product still needs real E2E depth, CI quality gates, persistence,
observability and (optionally) an LLM. Those items live in
[`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md). They are not silently
treated as completed by Milestone 5 or Milestone 6.

| Capability | Status | Direction |
|---|---|---|
| AI-assisted root-cause intelligence | 🚧 In progress | Sentinel AI is heuristic; it is not an LLM and must keep uncertainty labels |
| Unified dashboard intelligence | 🚧 In progress | M7.2 advisory panel exists; remaining intelligence layers still have evidence gaps |
| Discovery-aware release readiness | 🚧 In progress | M7.3 provenance panel exists; UX/UI, security and performance evidence is still thin |
| GitHub Actions integration | 🚧 In progress | Typecheck and analyzer unit tests are required; live Nation/Skills Chromium runs upload artifacts and may flake |
| Dashboard sample data | ✅ Foundation | `npm run dashboard:sample` seeds a tiny stub; live JSON stays gitignored |
| Requirements and critical-flow catalogs | ✅ Foundation | JSON catalogs exist and tests annotate IDs; many flows are still not-tested |
| PDF executive reports | 🚧 Planned | Add distributable executive PDF output |
| Multi-project dashboard | 🚧 Planned | Expand dashboard support across several products |

## Ubuntu + VS Code workflow

Default development is **Ubuntu on WSL** plus **VS Code** (Remote - WSL).

```bash
cd /mnt/c/Users/Pette/Downloads/qa-sentinel-tyra-main
cp .env.example .env
npm install
npx playwright install chromium
npm run typecheck
npm run test:unit
npm run test:nation:ci
npm run dashboard
```

Shared editor defaults live in `.vscode/` (LF endings, Playwright extension,
tasks). Details: README “Ubuntu / WSL and VS Code”.

## Milestone 7 – Unified Dashboard Intelligence & Operationalization 🚧 IN PROGRESS

**Status: IN PROGRESS** (deliveries 7.1–7.3 are in the tree; 7.4–7.8 are not done)

Earlier docs marked Milestone 7 as “not started”. That was stale. Commits on
`main` already added operational npm commands, the advisory Autonomous QA
dashboard panel, and discovery-aware release-readiness provenance.

| Delivery | Status | What exists / what does not |
|---|---|---|
| 7.1 Operational Test Orchestration | ✅ Done | `test:nation`, `test:skills`, `scan:nation`, `scan:skills`, `qa:full` keep site output separate |
| 7.2 Unified Advisory Dashboard | ✅ Done | `dashboard/index.html` Autonomous QA panel binds `autonomousQaAssessment` without execution authority |
| 7.3 Discovery-aware Release Readiness | ✅ Done | Discovery provenance panel and CSS are wired; still depends on current-run evidence |
| 7.4 UX/UI Verification Coverage | 🧭 Not started | Analyzer areas remain largely `not-verified`; no a11y axe/lighthouse suite |
| 7.5 Security Verification Coverage | 🚧 Partial | `config/security-performance.json` lists required checks; there are still no dedicated header/cookie/session tests. `requiredChecks` is not yet consumed by the analyzer |
| 7.6 Performance Verification Coverage | 🚧 Partial | Duration thresholds are configured; page-load and API/backend latency are still not observed as metrics |
| 7.7 Evidence-grounded Root-cause Intelligence | 🚧 Partial | Sentinel AI is heuristic pattern matching, not an LLM |
| 7.8 Milestone Validation & Documentation | 🚧 Partial | ROADMAP/README/backlog aligned; full-matrix regression and a safety audit are still due |

### Milestone 7 authority and safety contract

- Unified Decisioning v5 remains the only canonical release authority.
- Milestone 7 introduces no competing weighted score.
- Autonomous test execution remains intentionally disabled and advisory-only.
- Remediation authorization and automatic release-decision updates remain intentionally disabled.
- Test commands are launched only by an explicit developer or CI action.
- Positive health requires current, relevant evidence; absence of findings is never sufficient.
- First-party evidence remains sanitized and source provenance remains visible.
- Compatibility failures, promoted issues and uncertainty must not be hidden by positive evidence.

**Milestone 7:** 🚧 IN PROGRESS — 7.1–7.3 in code; 7.4–7.8 open. See [`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md).
