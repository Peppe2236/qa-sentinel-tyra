# QA Sentinel Tyra Roadmap

## Current state

QA Sentinel Tyra has completed the **Milestone 5 Quality Intelligence Framework**, the **Milestone 6 Advisory Autonomous QA Framework**, and **Milestone 7 Unified Dashboard Intelligence & Operationalization**.

**Milestone 8 Security Weakness Intelligence is IN PROGRESS.** The security execution modes, Security Orchestrator, repository security engines, Security Posture, triage v2 and Auth/AuthZ M8.2.4 A–D integration are now delivered and production-safe verified. Deeper API authorization, cross-user/role/IDOR verification, server-side logout invalidation, historical correlation and canonical Unified Decisioning integration remain unfinished.

On **2026-09-16**, QA Sentinel Tyra also delivered a cross-cutting **Desktop Workbench & Operator Experience** layer. This is an operational interface enhancement rather than a new release-authority model: Unified Decisioning v5 remains canonical and Autonomous QA remains advisory-only.

QA Sentinel Tyra is evolving from a Playwright-centered QA tool into an **evidence-driven Quality Intelligence ecosystem**. Playwright remains a core execution engine, but Discovery, Functional QA, Security, Accessibility, UX/UI, Performance, API/Backend, Root-Cause Intelligence, Cross-Layer Correlation, Unified Decisioning, Sentinel AI / Eve, reporting and advisory Autonomous QA all contribute to one evidence model.

## Current M8 verification — 2026-09-23

The current Milestone 8 implementation has reached the following verified boundary.

| Track | Status |
|---|---|
| M8.1 QA Trust & Run Integrity | Foundation delivered; remaining hardening tracked separately |
| M8.2 Security Orchestrator | ✅ Verified |
| Repository security engines | ✅ npm audit / Gitleaks / Semgrep / Trivy |
| Security Posture | ✅ Verified foundation |
| Security triage v2 | ✅ Verified |
| M8.2.4A Auth/AuthZ foundation | ✅ Verified |
| M8.2.4B Protected-route verification | ✅ Verified |
| M8.2.4C Security Posture integration | ✅ Verified |
| M8.2.4D Finding normalization | ✅ Verified |
| M8.2.4E+ deeper authorization | 🚧 NOT VERIFIED |

### Latest authorized Production Safe verification

- Evidence status: **COMPLETE**
- Applicable engines: **6/6**
- Raw observations: **4**
- Unique findings: **4**
- Open findings: **1**
- Confirmed findings: **1**
- Needs review: **0**
- False positives: **3**
- Actionable critical: **0**
- Actionable high: **0**
- Actionable medium: **1**
- Actionable low: **0**

### Auth/AuthZ verification

- Sites checked: **2/2**
- Route checks: **15**
- Open Auth/AuthZ findings: **0**
- Engine execution: **complete**
- Verification coverage: **partial**
- Finding normalization: **complete**
- Triage pending: **false**

The confirmed MEDIUM finding is the missing `Content-Security-Policy`
configuration weakness on AI Skills. Missing CSP alone is not treated as
proof of exploitable XSS.

The following Auth/AuthZ dimensions remain explicitly **NOT VERIFIED**:

- cross-user authorization
- role authorization
- object ownership / IDOR
- server API authorization
- server-side logout invalidation

`100%` engine execution coverage means all applicable configured security
engines completed. It does not mean complete application-security or
authorization coverage.

## Decision authority and safety boundaries

- Unified Decisioning is the canonical release authority for dashboard schema v5.
- `releaseDecisionSource: 'unified-v5'` identifies the canonical decision path.
- The legacy release assessment remains comparison telemetry only.
- Autonomous QA remains advisory-only; execution authority is not granted by the advisory analyzers.
- Production remediation and automatic release-decision updates remain disabled.
- Existing Unified Decision, P0–P4 priority and evidence semantics are reused; no competing weighted score is introduced.
- Partial/scoped verification is never promoted to full release verification.
- Pentest evidence remains isolated from canonical release authority until its integration contract is explicitly implemented and validated.

---

## Milestone summary

| Milestone / enhancement | Status | Direction |
|---|---|---|
| **M5 — Quality Intelligence Framework** | ✅ Complete | Shared evidence, domain intelligence and Unified Decisioning |
| **M6 — Advisory Autonomous QA Framework** | ✅ Complete | Risk-based advisory planning, reproduction, verification, drift and investigation |
| **M7 — Unified Dashboard Intelligence & Operationalization** | ✅ Complete | Operational orchestration, evidence-grounded dashboard, measured quality signals and reporting |
| **Post-M7 — Desktop Workbench & Operator Experience** | ✅ Delivered | Dedicated desktop operator surface, targeting, Release Status, accessibility, language/theme support |
| **M8 — Security Weakness Intelligence** | 🚧 In progress | Safe security modes delivered; canonical security evidence/correlation continues |
| **M9 — Sentinel Ecosystem Intelligence** | 🧭 Planned | Shared Evidence Engine and ecosystem-wide domain integration |
| **M10 — Platform & Enterprise Evolution** | 🧭 Planned | Multi-project, policy, CI/CD, auditability, APIs and reusable modules |

---

## Milestone 5 — Quality Intelligence Framework ✅ COMPLETE

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

Unified Decisioning is the canonical schema-v5 release authority. Legacy release assessment remains comparison telemetry.

---

## Milestone 6 — Advisory Autonomous QA Framework ✅ COMPLETE

**Completed: 2026-08-17**

| Delivery | Completed advisory capability |
|---|---|
| 6.1 Advisory Autonomous QA Foundation | Advisory assessment, provenance and candidate-action model |
| 6.2 Risk-based Test Selection | Logical-test candidates based on existing risk, Unified Decision and provenance |
| 6.3 Advisory Execution Planning | Ordered phases and advisory test steps; execution remains disabled |
| 6.4 Advisory Failure Reproduction | Evidence-linked reproduction recipes for failed current-run tests |
| 6.5 Advisory Verification Planning | Verification plans remain `awaiting-new-evidence` |
| 6.6 Advisory Change Impact Analysis | Potential change impact without claiming confirmation |
| 6.7 Advisory Quality Drift Comparison | Pairwise comparison with the latest prior canonical schema-v5 run |
| 6.8 Advisory Investigation Planning | Investigation cases and unconfirmed hypotheses for changed/potential-regression signals |

### Milestone 6 safety contract

- `executionEnabled: false`
- advisory actions and plans use `executable: false`
- analyzers launch no Playwright tests or shell commands by themselves
- remediation is not authorized or applied
- release decisions are not automatically updated
- verification requires new evidence
- potential impact, drift and root cause remain unconfirmed until evidence supports them

---

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

---

## Milestone 7 — Unified Dashboard Intelligence & Operationalization ✅ COMPLETE

**Completed: 2026-08-18**

| Delivery | Status | Completed capability |
|---|---|---|
| 7.1 Operational Test Orchestration | ✅ Done | `qa:unattended` = scan + full 18-project matrix; `qa:sites` = Chromium-fast; `qa:matrix` = matrix without scan |
| 7.2 Unified Advisory Dashboard | ✅ Done | Control Center + Autonomous QA panel consume advisory, human-review, remediation, discovery, both sites and reports |
| 7.3 Discovery-aware Release Readiness | ✅ Done | Discovery provenance and scan inventory contribute to release-scope readiness |
| 7.4 UX/UI Verification Coverage | ✅ Done | axe-core smoke, nav/forms, reduced motion, layout-shift observation and viewport/profile evidence |
| 7.5 Security Verification Coverage | ✅ Done | Headers, cookies, mixed content and HTTPS-link evidence |
| 7.6 Performance Verification Coverage | ✅ Done | Page-load and first-party API timing plus LCP/FCP when available |
| 7.7 Evidence-grounded Root-cause Intelligence | ✅ Done | Heuristic notes always; optional LLM enrichment fails open |
| 7.8 Milestone Validation & Documentation | ✅ Done | GitHub/operational documentation, reporting, traceability and CI support |

### Milestone 7 authority and safety contract

- Unified Decisioning v5 remains the only canonical release authority.
- Milestone 7 introduces no competing score.
- Autonomous test execution remains disabled by policy and advisory-only.
- Production remediation and automatic release-decision updates remain human-controlled.
- Positive health requires current relevant evidence; absence of findings is not sufficient.
- Source provenance and uncertainty remain visible.

---

## Post-M7 — Desktop Workbench & Operator Experience ✅ DELIVERED

**Delivered: 2026-09-16**

The Workbench is the primary local operator interface for QA Sentinel Tyra. It replaces the browser-first, long stacked-panel experience with a compact desktop-style control center while preserving the same evidence and release-authority semantics.

### Delivered operator capabilities

| Capability | Delivered behavior |
|---|---|
| Desktop Workbench | Dedicated app-like QA Sentinel Tyra window |
| Default startup | Opens Workbench only; does **not** automatically start Full QA |
| Explicit auto-run | `--auto-test` opts into automatic Full QA at startup |
| Main navigation | Dashboard, Run Full QA, Fast Chromium, Security Modes, Reports, Playwright, Accessibility, Settings |
| Run targeting | Both sites / Nation only / AI Skills only |
| Release Status | Build → Tests → Analysis → Report → Release Decision |
| Playwright report | On demand only |
| Reports UX | Evidence views are menu-driven instead of one long stacked dashboard |
| Accessibility | Dedicated top-level Workbench view with persisted local display preferences |
| Languages | English default + Swedish, Simplified Chinese, Hindi, Spanish, Arabic RTL, French |
| Colour themes | Tyra Azure, Emerald, Amethyst, Amber, Rose, Arctic |
| Visual identity | Current Tyra banner, desktop icon and dark cinematic Workbench shell |
| Windows packaging | RAW `pkg` build plus failsafe icon post-processing and `--check` verification |

### Workbench trust rules

- Choosing Nation-only or AI-Skills-only scopes the run; scoped evidence must not be presented as a full release decision.
- `Both sites` is required when the operator intends to evaluate both applications together.
- The Workbench displays and launches QA actions; it does not override Unified Decisioning.
- Security Modes retain their separate authorization boundaries.
- Accessibility, theme and language preferences are presentation settings and do not alter test evidence, scoring or release readiness.

---

## Latest development validation — 2026-09-16

The latest development work includes the Security Modes foundation, Windows launcher hardening and the Desktop Workbench. These are **development/launcher validations**, not a substitute for a fresh full release-scope web QA run.

| Validation | Current evidence |
|---|---|
| Security-mode local validation | 140 passed in the validated security/launcher boundary |
| Production Safe | Dependency audit, HTTP/security headers, TLS/certificate checks; optional authorized ZAP Baseline |
| Staging Active | Active ZAP Full Scan only for allowlisted non-production staging targets |
| Manual Validation | Checklist/report workflow; no network requests |
| Pentest release authority | Isolated from Unified Decisioning |
| Desktop Workbench | Delivered and manually exercised as the operator UI |
| EXE default behavior | Opens Workbench without automatic Full QA |
| Playwright launch behavior | Report starts/opens only on operator request |

### Historical Chromium prototype snapshot — 2026-08-25

- 151 discovered tests
- 146 passed / 5 failed
- 0 skipped / 0 flaky
- 99% weighted Quality Health
- release scope remained partial/unscoped, therefore **RELEASE NOT VERIFIED**

### Historical full compatibility-matrix snapshot — 2026-08-17

- 175 tests
- 152 passed / 23 failed
- 96% health
- Ready with warnings
- API/backend evidence: 22 endpoints, 2 services, 47 sanitized first-party records

Dated validation snapshots are evidence records, not permanent guarantees of current application health.

---

## Milestone 8 — Security Weakness Intelligence 🚧 IN PROGRESS

**Foundation validated: 2026-09-16**

### Goal

Build a dedicated **non-destructive Security Weakness Intelligence** layer that can discover, classify, explain and report security weaknesses without overstating the evidence.

Milestone 8 does **not** turn normal QA runs into uncontrolled penetration testing. Security execution is separated into explicit operating modes with authorization and environment boundaries.

### Delivered security execution modes

| Mode | Current behavior | Authority boundary |
|---|---|---|
| **Production Safe** | Local dependency audit, HTTP/security headers, TLS/certificate assessment; optional ZAP Baseline | Explicit authorization; non-destructive only |
| **Staging Active** | Active ZAP Full Scan against configured staging | Allowlisted non-production targets; `QA_PENTEST_AUTHORIZED=true` + `QA_PENTEST_ACTIVE=true`; production domains blocked |
| **Manual Validation** | OWASP-oriented checklist/report for auth, authorization, sessions, APIs and business logic | No network requests |

### Security evidence maturity model

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

### Delivery status

| Delivery | Status | Capability |
|---|---|---|
| 8.1 Security Evidence Foundation | 🚧 Advanced foundation | Mode separation, authorization/scope boundaries, Security Posture, fingerprinting and triage are delivered; canonical release integration remains separate |
| 8.2 Header & Browser Security Intelligence | ✅ Foundation delivered | HTTP/security headers, TLS/certificate assessment and normalized Security Posture evidence in Production Safe |
| 8.3 Cookie & Session Security | 🚧 Partial | Session-cookie defensive flags and saved-session behavior are observed; server-side invalidation remains NOT VERIFIED |
| 8.4 Authentication & Authorization Intelligence | 🚧 Advanced foundation | M8.2.4 A–D verified: protected-route checks, session-state boundaries, engine coverage, shared finding normalization and triage; cross-user/role/IDOR/API/logout dimensions remain NOT VERIFIED |
| 8.5 CORS & Cross-Origin Intelligence | 🧭 Planned / expandable | Evidence-driven CORS assessment without fabricating exploitability |
| 8.6 Information Disclosure Intelligence | 🚧 Partial | Optional safe exposure/sensitive-path checks; deeper classification continues |
| 8.7 API Security Evidence | 🚧 Partial | Existing first-party API observations are available; passive server API authorization evidence remains NOT VERIFIED |
| 8.8 Safe Input & Abuse-Resistance Signals | 🚧 Partial | Manual foundation delivered; automated non-destructive signals continue |
| 8.9 Security Posture & Correlation | 🚧 Partial | Shared Security Posture, engine coverage, normalization, fingerprints and triage are delivered; historical comparison and deeper cross-tool correlation continue |
| 8.10 Security Reporting & Unified Decisioning | 🚧 Partial | Pentest and Security Posture dashboard/report evidence delivered; canonical Unified Decisioning integration intentionally remains inactive |

### Next M8 implementation order

1. **M8.2.4E — Passive API authorization evidence**
   - Nation GraphQL and AI Skills API/session boundary evidence
   - status, redirect and authorization behavior only
   - no response-sensitive bodies
   - no mutation, fuzzing or arbitrary identifier enumeration

2. **Cross-user and role authorization**
   - requires explicitly approved dedicated User A / User B / role accounts
   - only configured resources may be compared
   - no automatic resource discovery or ID enumeration

3. **Object ownership / IDOR verification**
   - explicit approved test resources only
   - evidence-driven access-control comparison

4. **Server-side logout invalidation**
   - ephemeral sessions only
   - verify whether invalidated sessions remain usable

5. **Historical Security Posture**
   - compare normalized findings across runs
   - distinguish new, persistent and resolved findings

6. **Cross-tool root-cause correlation**
   - dependency advisories
   - secret findings
   - SAST
   - DAST / header evidence
   - Auth/AuthZ
   - stable correlation semantics

7. **Canonical security / Unified Decision integration**
   - only after the evidence and correlation contract is explicitly validated
   - no silent release-score changes

### Milestone 8 safety contract

- Security assessment is **non-destructive by default**.
- Ordinary QA configuration never implies authorization for intrusive testing.
- Production Safe may observe production only within explicitly authorized non-destructive checks.
- Staging Active is restricted to allowlisted **non-production** targets.
- ZAP Full Scan requires double opt-in: authorization + active mode.
- Active exploitation, destructive payloads, credential attacks and persistence remain outside normal Sentinel operation.
- Manual Validation performs no network requests.
- A missing control may be a weakness without being a confirmed vulnerability.
- Pentest results do not silently modify Unified Decisioning or release readiness.
- Production-changing actions remain human-controlled.

**Milestone 8:** 🚧 IN PROGRESS — security modes and reporting foundation delivered; shared evidence/correlation completion remains.

---

## Milestone 9 — Sentinel Ecosystem Intelligence 🧭 PLANNED

### Goal

Formalize the shared **Evidence Engine** so every Sentinel domain uses common provenance, confidence, maturity, correlation and coverage semantics.

### Planned directions

- Central Evidence Engine
- standardized domain adapters
- shared provenance, confidence and evidence semantics
- ecosystem-wide correlation
- coverage-closure intelligence
- historical/regression intelligence
- Sentinel AI / Eve ecosystem reasoning
- unified Quality Command Center / Workbench evidence model

---

## Milestone 10 — Platform & Enterprise Evolution 🧭 PLANNED

### Planned directions

- generalized multi-project command center
- long-term quality/security trends
- CI/CD and pull-request quality gates
- configurable policy profiles
- team/project profiles
- audit trail and evidence-decision history
- integration/export API
- plugin/module architecture
- reusable application adapters
- notification and quality-event integrations

---

## Remaining operational work

These are real dependencies or administrative steps and must not be silently described as completed:

- credentialed member-route depth depends on `NATION_TEST_*` / `AI_SKILLS_TEST_*`
- optional LLM enrichment depends on `SENTINEL_LLM_API_KEY` or `OPENAI_API_KEY`
- optional paid iframe captcha solving depends on `SENTINEL_CAPTCHA_SOLVER_KEY`
- GitHub Pages must be enabled in repository settings
- branch protection requires repository-admin configuration
- CI authenticated journeys require configured GitHub Actions secrets

See [`docs/QA-SYSTEM-BACKLOG.md`](docs/QA-SYSTEM-BACKLOG.md) for operational leftovers.

---

## Development workflow

Default development remains **Ubuntu on WSL + VS Code Remote - WSL**.

```bash
cd /mnt/c/Users/Pette/Downloads/qa-sentinel-tyra-main
npm install
npx playwright install chromium firefox webkit
npm run typecheck
npm run test:unit
```

Main execution paths:

```bash
# Full release-scope local run across both configured sites
npm run qa:unattended

# Fast Chromium both-sites path
npm run qa:sites

# Site-scoped paths
npm run qa:nation
npm run qa:skills

# Desktop Workbench build
npm run build:exe
```

The Workbench normally opens without auto-running QA. Automatic Full QA at EXE startup is explicit:

```powershell
.\dist\QA-Sentinel-Tyra.exe --auto-test
```

---

## Status line

```text
M5  Quality Intelligence Framework                  ✅ COMPLETE
M6  Advisory Autonomous QA Framework                ✅ COMPLETE
M7  Unified Dashboard & Operationalization          ✅ COMPLETE
     Desktop Workbench & Operator Experience        ✅ DELIVERED
M8  Security Weakness Intelligence                  🚧 IN PROGRESS
M9  Sentinel Ecosystem Intelligence                 🧭 PLANNED
M10 Platform & Enterprise Evolution                 🧭 PLANNED
```

The development doctrine remains unchanged:

> **Evidence before conclusions. NOT VERIFIED is not PASSED.**

## Post-M7 authenticated discovery & session management — ✅ VERIFIED 2026-09-21

The post-M7 operational layer now includes verified multi-site authenticated discovery and desktop session management.

Completed and verified:

- unified anonymous + authenticated discovery for Nation and AI Skills
- protected-route authentication verification
- authenticated AI Skills `/my-pathway` coverage
- safe Interaction Discovery
- interaction clipping telemetry
- combined multi-site coverage
- Authentication Manager in the Workbench
- real-Chrome Google login handoff
- automatic session capture after manual login
- automatic authenticated rescan and coverage rebuild
- rebuilt and manually verified Windows EXE

Verified discovery snapshot:

- Authentication: **COMPLETE**
- Unique/effective routes: **49 / 49**
- Authenticated routes: **48**
- Dynamic-content routes: **24**
- Safe interactions: **225**
- Interaction clipping at 20/page: **none**
- Coverage limited: **false**

This is verified post-M7 operational hardening. Milestone 8 Security Weakness Intelligence remains **IN PROGRESS** until deeper security evidence correlation and Unified Decision integration are completed and validated.
