# QA Sentinel Tyra Roadmap

## Current state

QA Sentinel Tyra has completed the **Milestone 5 Quality Intelligence Framework**, the **Milestone 6 Advisory Autonomous QA Framework**, and **Milestone 7 Unified Dashboard Intelligence & Operationalization**.

The project is now formally evolving from a Playwright-centered QA platform into an **evidence-driven Quality Intelligence ecosystem**. Playwright remains a core execution engine, but the long-term architecture is broader: Discovery, Functional QA, Security, Accessibility, UX/UI, Performance, API/Backend, Root-Cause Intelligence, Cross-Layer Correlation, Unified Decisioning, Sentinel AI / Eve, reporting and advisory Autonomous QA all contribute to one shared evidence model.

Earlier foundations — Playwright reporting, Deep Discovery, actionable issue consolidation and the Quality Command Center — provide the evidence consumed by these frameworks.

After Milestone 6, Sentinel AI was bound to the live dashboard and positive first-party API/backend verification evidence was integrated into canonical release readiness. Post-M7 hardening also added authenticated Google-SSO session coverage for Nation and AI Skills, dynamic discovered-route coverage, clearer pass-rate versus Quality Health presentation, and a release-scope integrity guard so partial runs cannot publish a full release decision.

### Current prototype baseline — 2026-08-25

The current two-site Chromium prototype suite has been verified at **151 discovered tests** with **146 passed, 5 failed, 0 skipped, 0 flaky and 99% Quality Health**. The five retained failures are classified findings rather than hidden automation noise: one Nation accessibility issue, one Nation product/theme issue, one Nation content issue and two AI Skills CSP/security findings.

A targeted seven-test authenticated AI Skills run was also verified to report **`RELEASE NOT VERIFIED`** rather than a false full release decision. This establishes the current demo-integrity rule:

> **A partial run may report valid test evidence, but it may not claim full release readiness.**

The historical 2026-08-17 18-project compatibility matrix remains a separate validation snapshot and should not be confused with the current Chromium prototype baseline.
## Decision authority and safety boundaries

- Unified Decisioning is the canonical release authority for dashboard schema v5.
- `releaseDecisionSource: 'unified-v5'` identifies the canonical decision path.
- The legacy release assessment remains available only as comparison telemetry.
- Autonomous QA is advisory-only: execution, remediation authorization and automatic release-decision updates remain intentionally disabled.
- Existing Unified Decision, P0–P4 priority and evidence semantics are reused; no competing weighted score is introduced.
- **Evidence before conclusions:** Sentinel must never claim more than the available evidence supports.
- **Not verified is not passed:** missing or out-of-scope evidence remains a verification gap.
- **Partial runs are not release runs:** arbitrary targeted Playwright runs must resolve release readiness to `not-verified` unless the full configured release scope is explicitly selected.
- **Security evidence is maturity-based:** an observation is not automatically a weakness, and a weakness is not automatically a vulnerability.
- Production-changing actions remain human-controlled.
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
| Google SSO authenticated session coverage | ✅ Nation and AI Skills storageState reuse, protected-route access, cookie security and logout/session invalidation checks verified |
| Dynamic generated-route coverage | ✅ Current scanner inventory contributes 13 generated routes for Nation and 13 for AI Skills |
| Partial-run release integrity | ✅ Targeted runs retain test findings but publish `not-verified` instead of a false full release decision |
| Demo semantics | ✅ Project percentages are identified as pass rate while weighted overall Quality Health remains a separate metric |
| Current Chromium prototype baseline | ✅ 2026-08-25: 151 tests, 146 passed, 5 classified findings, 0 skipped, 0 flaky, 99% Quality Health |

## Remaining planned work

The next major development phase is no longer a single backlog of isolated QA features. QA Sentinel Tyra is being organized as a **modular Quality Intelligence ecosystem**.

Immediate work is divided into three planned milestones:

| Milestone | Status | Direction |
|---|---|---|
| **M8 — Security Weakness Intelligence** | 🧭 Planned | Build non-destructive, evidence-driven security assessment and Security Posture intelligence |
| **M9 — Sentinel Ecosystem Intelligence** | 🧭 Planned | Formalize the shared Evidence Engine and connect all quality domains through common models and decision semantics |
| **M10 — Platform & Enterprise Evolution** | 🧭 Planned | Expand to multi-project, CI/CD, policies, auditability, integrations and reusable modules/adapters |

Existing operational backlog items that require credentials, GitHub administration or optional external services remain tracked in [`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md).

The development rule for future milestones is:

> **New capabilities must feed shared evidence, provenance, correlation and Unified Decisioning rather than become isolated tools.**

| Capability | Status | Direction |
|---|---|---|
| AI-assisted root-cause intelligence | ✅ Done / expandable | Heuristic notes always; LLM enrichment remains optional and evidence-bound |
| Unified dashboard intelligence | ✅ Done / expandable | Quality Command Center remains the central presentation layer for ecosystem intelligence |
| Discovery-aware release readiness | ✅ Done | Discovery evidence and route inventory remain part of release verification |
| Authenticated E2E foundation | ✅ Verified | Nation and AI Skills Google-SSO storageState/session coverage works; deeper authenticated product journeys continue as coverage expansion |
| Release-scope integrity | ✅ Verified | Partial/targeted runs report `RELEASE NOT VERIFIED`; only explicitly full scope may publish canonical release readiness |
| GitHub Actions integration | ✅ Done | Typecheck/unit and QA workflows remain the CI foundation; future M10 work adds richer PR/release policies |
| GitHub Pages sample dashboard | ✅ Workflow | Repository admin must still enable Pages where required |
| Branch protection | 📄 Docs | Repository-admin configuration remains external to Sentinel runtime |
| Dashboard sample data | ✅ Foundation | Sanitized sample data supports public/demo views without publishing live secrets |
| Requirements and critical-flow catalogs | ✅ Foundation | Continue expanding traceability and coverage closure |
| PDF executive reports | ✅ Done | Executive reporting remains part of the shared ecosystem output layer |
| Multi-project dashboard | ✅ Done | Nation + AI Skills are the current reference projects; M10 generalizes this model |
| Keyboard / focus a11y | ✅ Done | Expand per-route and per-profile accessibility coverage over time |
| Lighthouse | ✅ Dispatch | Performance evidence can continue to grow into trend/budget intelligence |
| History retention | ✅ Done | Current history supports future trend and regression intelligence |
## Ubuntu + VS Code workflow

Default development is **Ubuntu on WSL** plus **VS Code** (Remote - WSL).

```bash
cd qa-sentinel-tyra
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
| 7.8 Milestone Validation & Documentation | ✅ Done | ROADMAP lists activated vs policy-disabled; nightly GitHub `qa:sites` (Chromium); local `qa:unattended` is the full 18-matrix. Pages workflow, optional CI 18-matrix, keyboard a11y, Lighthouse dispatch, history cap, traceability and PR comments are in-repo; Pages toggle and branch protection still need GitHub admin |

### Milestone 7 authority and safety contract

- Unified Decisioning v5 remains the only canonical release authority.
- Milestone 7 introduces no competing weighted score.
- Autonomous test execution remains disabled by policy and advisory-only.
- Remediation authorization and automatic release-decision updates remain disabled by policy.
- Test commands are launched only by an explicit developer or CI action.
- Positive health requires current, relevant evidence; absence of findings is never sufficient.
- First-party evidence remains sanitized and source provenance remains visible.
- Compatibility failures, promoted issues and uncertainty must not be hidden by positive evidence.

**Milestone 7:** ✅ COMPLETE — leftovers that need credentials or repo admin (Pages toggle, branch protection, login secrets) live in [`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md) as post-M7 work, not silent gaps inside 7.1–7.8.

---

## Milestone 8 – Security Weakness Intelligence 🧭 PLANNED

### Goal

Build a dedicated **non-destructive Security Weakness Intelligence** layer that can discover, classify, explain and report security weaknesses without overstating the evidence.

Milestone 8 does **not** turn normal QA runs into uncontrolled penetration testing. The default operating mode is safe observation and verification against systems the operator is authorized to test.

### Security evidence maturity model

Sentinel security findings must use an explicit maturity model:

```text
NOT VERIFIED
    ↓
SECURITY OBSERVATION
    ↓
CONFIRMED WEAKNESS
    ↓
SUSPECTED VULNERABILITY
    ↓
CONFIRMED VULNERABILITY
```

A finding may only move upward when new evidence supports the stronger claim.

### Planned deliveries

| Delivery | Planned capability |
|---|---|
| 8.1 Security Evidence Foundation | Shared security evidence model, provenance, scope, confidence and maturity state |
| 8.2 Header & Browser Security Intelligence | CSP, HSTS, clickjacking protection, Referrer-Policy, Permissions-Policy and related browser controls |
| 8.3 Cookie & Session Security | Secure/HttpOnly/SameSite analysis, session reuse, logout invalidation and session-boundary evidence |
| 8.4 Authentication & Authorization Intelligence | Protected-route access, anonymous/member boundaries and safe authorization verification |
| 8.5 CORS & Cross-Origin Intelligence | Detect overly broad or inconsistent cross-origin policy evidence without fabricating exploitability |
| 8.6 Information Disclosure Intelligence | Stack traces, debug output, framework/version leakage and exposed diagnostic/admin routes |
| 8.7 API Security Evidence | Authentication/authorization evidence, unexpected 401/403/5xx patterns and first-party API security observations |
| 8.8 Safe Input & Abuse-Resistance Signals | Non-destructive reflection/validation checks, repeated-submit and rate-limit verification |
| 8.9 Security Posture & Correlation | Security Posture score, deduplication, root-cause links and Cross-Layer correlation |
| 8.10 Security Reporting & Unified Decisioning | Dashboard view, remediation guidance, executive output, history and release-decision integration |

### Milestone 8 safety contract

- Security assessment is **non-destructive by default**.
- Ordinary QA configuration must never imply authorization for intrusive testing.
- Active exploitation, destructive payloads, credential attacks and persistence are outside normal Sentinel operation.
- Any future active-security mode must require explicit authorization, scope and policy controls.
- A missing control may be a weakness without being a confirmed vulnerability.
- A suspected vulnerability must remain suspected until reproducible evidence supports confirmation.
- Security evidence must preserve source, route/endpoint, timestamp, scope and confidence where available.
- Production-changing actions remain human-controlled.

---

## Milestone 9 – Sentinel Ecosystem Intelligence 🧭 PLANNED

### Goal

Formalize QA Sentinel Tyra as a complete **Quality Intelligence ecosystem** with a shared Evidence Engine and consistent semantics across every quality domain.

The platform should no longer be understood as “Playwright plus a dashboard”. Playwright is one execution source inside a broader evidence architecture.

### Ecosystem architecture

```text
                    QA SENTINEL TYRA
                           │
                  QUALITY COMMAND CENTER
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
 Discovery            Functional QA        Security
     │                     │                     │
 Accessibility          UX / UI            Performance
     │                     │                     │
 API / Backend       Compatibility       Requirements
     └─────────────────────┼─────────────────────┘
                           │
                    EVIDENCE ENGINE
                           │
                 Root-Cause Intelligence
                           │
                 Cross-Layer Correlation
                           │
                  Unified Decisioning
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
   Dashboard            Reports        Sentinel AI / Eve
                                               │
                                    Advisory Autonomous QA
```

### Planned deliveries

| Delivery | Planned capability |
|---|---|
| 9.1 Central Evidence Engine | Common evidence envelope, provenance, maturity, confidence and scope |
| 9.2 Domain Adapter Model | Standard adapters for Functional, Discovery, Security, A11y, UX/UI, Performance, API/Backend and Compatibility |
| 9.3 Unified Confidence Semantics | Shared confidence language without inventing precision |
| 9.4 Ecosystem Correlation | Correlate evidence across domains while preserving source identity |
| 9.5 Coverage Closure Intelligence | Verified / partial / missing / human-review coverage map across routes, requirements and critical flows |
| 9.6 Unified Historical Intelligence | Cross-run comparison, regression evidence and trend semantics |
| 9.7 Sentinel AI / Eve Ecosystem Reasoning | Evidence-grounded explanations, prioritization and next-action guidance |
| 9.8 Ecosystem Command Center | One operational view across projects, quality domains, evidence and release state |

### Shared intelligence doctrine

Every intelligence module should answer, whenever evidence permits:

```text
What was verified?
What evidence was observed?
What does the evidence support?
How confident is Sentinel?
What should happen next?
```

Missing evidence stays missing evidence. It must never be silently converted into success.

---

## Milestone 10 – Platform & Enterprise Evolution 🧭 PLANNED

### Goal

Evolve QA Sentinel Tyra from a powerful project-specific ecosystem into a reusable quality platform for multiple applications, teams and delivery pipelines.

### Planned deliveries

| Delivery | Planned capability |
|---|---|
| 10.1 Multi-project Quality Command Center | Generalized project registration, filtering and portfolio-level health |
| 10.2 Historical Quality & Security Trends | Long-term regression, posture and release history |
| 10.3 CI/CD Quality Gates | Configurable pipeline and pull-request policies |
| 10.4 GitHub Integration | PR evidence summaries, issue workflows and release-context integration |
| 10.5 Policy Profiles | Organization/project policies for scope, release, security and automation boundaries |
| 10.6 Team & Project Profiles | Reusable configuration and ownership metadata |
| 10.7 Audit Trail | Evidence provenance, decision history and policy-change traceability |
| 10.8 Integration & Export API | Machine-readable external access to sanitized Sentinel evidence and decisions |
| 10.9 Plugin / Module Architecture | Extensible analyzers, adapters and integrations without modifying core decision semantics |
| 10.10 Reusable Application Adapters | Project templates for new sites and systems |
| 10.11 Notification & Quality Events | Optional external notifications and event integrations |
| 10.12 Enterprise Operationalization | Scalable configuration, governance, retention and deployment patterns |

---

## Ecosystem doctrine

QA Sentinel Tyra should become more capable without becoming less trustworthy.

The core rule is:

> **Sentinel must never claim more than the available evidence supports.**

Therefore:

- untested does not mean passed;
- partial verification does not mean full release verification;
- a warning does not automatically mean a release blocker;
- a security observation does not automatically mean a weakness;
- a weakness does not automatically mean a vulnerability;
- correlation does not automatically prove causation;
- AI-generated analysis must remain traceable to evidence;
- confidence must describe evidence strength rather than cosmetic certainty;
- autonomous recommendations must not silently become execution authority;
- production-changing actions remain human-controlled.

This doctrine applies across Functional QA, Discovery, Security, Accessibility, UX/UI, Performance, Compatibility, API/Backend, Requirements, Critical Flows, Root Cause, Cross-Layer Intelligence, Sentinel AI / Eve and all future modules.

---

## Planned milestone sequence

```text
M5  Quality Intelligence Framework                  ✅ COMPLETE
M6  Advisory Autonomous QA Framework                ✅ COMPLETE
M7  Unified Dashboard & Operationalization          ✅ COMPLETE
M8  Security Weakness Intelligence                  🧭 PLANNED
M9  Sentinel Ecosystem Intelligence                 🧭 PLANNED
M10 Platform & Enterprise Evolution                 🧭 PLANNED
```

The roadmap remains evidence-driven: milestone completion should only be marked when the implemented capability and its safety/authority boundaries have been verified.

