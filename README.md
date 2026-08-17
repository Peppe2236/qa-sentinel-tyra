<p align="center">
  <img src="docs/assets/qa-sentinel-tyra-banner.png" alt="QA Sentinel Tyra" width="100%" />
</p>

<h1 align="center">QA Sentinel Tyra Enterprise</h1>

<p align="center">
  <strong>Enterprise Quality Intelligence for Playwright</strong><br/>
  Unified Decisioning, advisory Autonomous QA, Deep Discovery, live dashboards and executive reporting.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Playwright-Test-2EAD33?logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Reports-HTML%20%2B%20Markdown-7B61FF" alt="Reports" />
  <img src="https://img.shields.io/badge/Dashboard-Live-00C2FF" alt="Live Dashboard" />
  <img src="https://img.shields.io/badge/Deep%20Discovery-Active-success" alt="Deep Discovery" />
  <img src="https://img.shields.io/badge/Unified%20Decision-v5-00A6A6" alt="Unified Decision v5" />
  <img src="https://img.shields.io/badge/Milestone%206-Advisory%20QA-success" alt="Milestone 6 complete" />
  <img src="https://img.shields.io/badge/Milestone%207-Planned-5865F2" alt="Milestone 7 planned" />
</p>

---

## What is QA Sentinel Tyra?

QA Sentinel Tyra is a custom Playwright quality-intelligence platform that turns raw test results, discovered application signals and cross-layer evidence into information that is easier to understand, prioritize and act on.

Instead of stopping at **passed** or **failed**, QA Sentinel Tyra adds:

- requirements and functionality intelligence
- critical-flow coverage and impact analysis
- UX/UI, security, performance and compatibility intelligence
- API and backend intelligence with positive first-party verification evidence
- Deep Discovery and automatic route exploration
- runtime, network and security signal analysis
- root-cause fingerprinting and issue deduplication
- P0–P4 prioritization and severity guardrails
- cross-layer correlation
- Unified Decisioning for canonical schema-v5 release assessment
- advisory risk-based test selection and execution planning
- advisory failure reproduction and verification planning
- advisory change-impact, quality-drift and investigation planning
- live dashboard, HTML and Markdown reporting

The goal is simple:

**Quality First. Automate Everything. Ship with Confidence.**

Automation in Milestone 6 is deliberately advisory: QA Sentinel Tyra can propose what to inspect or verify, but it does not execute tests, authorize remediation or change release decisions autonomously.

---

## Current capabilities

| Capability | Status |
|---|---|
| Playwright test integration and custom QA reporter | ✅ |
| Live dashboard with automatic refresh | ✅ |
| HTML and Markdown reports | ✅ |
| Historical run data | ✅ |
| Multi-site Deep Discovery and route crawling | ✅ |
| Runtime, network and security/CSP signal analysis | ✅ |
| Discovery noise filtering | ✅ |
| Root-cause fingerprinting and deduplication | ✅ |
| Cross-browser and cross-profile issue consolidation | ✅ |
| P0–P4 prioritization and severity guardrails | ✅ |
| Requirements & Functionality Intelligence | ✅ M5.2 |
| Critical Flows Intelligence | ✅ M5.3 |
| UX/UI Intelligence | ✅ M5.4 |
| Security & Performance Intelligence | ✅ M5.5 |
| Compatibility Intelligence | ✅ M5.6 |
| API & Backend Intelligence | ✅ M5.7 |
| Cross-layer Correlation | ✅ M5.8 |
| Unified Scoring & Decisioning | ✅ M5.9 |
| Canonical schema-v5 release authority | ✅ |
| Advisory Autonomous QA foundation | ✅ M6.1 |
| Risk-based logical-test selection | ✅ M6.2 |
| Advisory execution planning | ✅ M6.3 |
| Advisory failure reproduction | ✅ M6.4 |
| Advisory verification planning | ✅ M6.5 |
| Advisory change-impact analysis | ✅ M6.6 |
| Advisory pairwise quality-drift comparison | ✅ M6.7 |
| Advisory investigation planning | ✅ M6.8 |
| Sentinel AI live dashboard binding | ✅ Post-M6 |
| Positive first-party API/backend verification evidence | ✅ Post-M6 |
| Full configured compatibility-matrix verification | ✅ Post-M6 |
| Autonomous test execution | 🔒 Intentionally disabled — advisory-only |
| Autonomous remediation and release updates | 🔒 Intentionally disabled — advisory-only |
| AI-assisted root-cause intelligence | 🚧 In progress |
| Unified dashboard intelligence | 🚧 In progress |
| Discovery-aware release readiness | 🚧 In progress |
| Milestone 7 — Unified Dashboard Intelligence & Operationalization | 🧭 Planned — not started |
| PDF executive reports | 🚧 Planned |
| GitHub Actions integration | 🚧 Planned |
| Multi-project dashboard | 🚧 Planned |

---

## Latest verified QA baseline

The latest full configured Playwright matrix was manually executed on **2026-08-17** after the post-M6 dashboard and API/backend evidence work.

| Metric | Verified result |
|---|---|
| Total tests | 175 |
| Passed / failed | 152 / 23 |
| Overall health | 96% |
| Release readiness | Ready with warnings |
| Release risk / confidence | Medium / 88% |
| API intelligence | Healthy — 22 positively verified endpoints |
| Backend intelligence | Healthy — 2 positively verified services |
| Positive API/backend evidence | 47 sanitized first-party records |
| API/backend release gaps | 0 |
| Compatibility release gaps | 0 |
| Remaining verification gaps | UX/UI, security and performance |

This is a dated validation snapshot, not a permanent guarantee of current application health. Compatibility remained `degraded` because real failures were retained even though configured matrix coverage was complete.

---

## Architecture

```mermaid
flowchart TB
    A[Playwright test results] --> C[Quality evidence]
    B[Discovery, API and backend signals] --> C
    C --> D[Quality-dimension analyzers]
    D --> E[Cross-layer correlation]
    E --> F[Unified Decision v5]
    F --> G[Dashboard and reports]
    F --> H[Advisory Autonomous QA]
```

Raw Playwright outcomes and Deep Discovery findings retain their source identity while they are normalized into a unified evidence model. Requirements, critical flows, UX/UI, security/performance, compatibility, API/backend and cross-layer analyzers then contribute to **Unified Decisioning**.

Unified Decisioning is the canonical release authority for dashboard schema v5. The legacy release assessment is retained only as comparison telemetry.

The Milestone 6 Autonomous QA layer consumes existing evidence and Unified Decision semantics. It may create candidates, plans, recipes, comparisons and hypotheses, but it has no execution, remediation or release-decision authority.

Successful same-origin `document`, `fetch` and `xhr` responses can now contribute sanitized positive API/backend verification evidence. Response bodies, credentials, query strings and URL fragments are not retained. Zero findings without positive evidence remains `not-verified`.

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/Peppe2236/qa-sentinel-tyra.git
cd qa-sentinel-tyra
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Playwright browsers

```bash
npx playwright install
```

### 4. Type-check the project

```bash
npm run typecheck
```

### 5. Run the Nation Chromium test suite

```bash
npx playwright test tests/nation --project=nation-chromium
```

Run the full configured browser and profile matrix with:

```bash
npx playwright test
```

### 6. Start the QA dashboard

```bash
npm run dashboard
```

Then open:

```text
http://127.0.0.1:4173/
```

---

## Deep Discovery

Deep Discovery allows QA Sentinel Tyra to explore configured applications independently of traditional assertion-based Playwright test cases.

The current discovery engine supports:

- multiple configured sites
- automatic route crawling
- route normalization
- runtime console signal collection
- network failure detection
- sanitized positive first-party `document`, `fetch` and `xhr` evidence
- security and Content Security Policy signals
- expected browser-event filtering
- telemetry noise filtering
- root-cause fingerprinting
- duplicate consolidation
- occurrence counting
- affected-route tracking
- priority scoring
- critical-route intelligence

The current implementation supports discovery across both:

```text
nation.dev
aiskills.nation.dev
```

Discovery reports are generated separately for each configured site.

Example:

```text
reports/discovery/nation.json
reports/discovery/ai-skills.json
```

---

## Positive API and backend verification evidence

Deep Discovery now retains safe metadata for successful first-party application responses:

```text
document → backend-service evidence
fetch/xhr → api-endpoint evidence
```

Only same-origin responses with successful HTTP status are eligible. Stored URLs are sanitized by removing credentials, query strings and fragments, and no response body is retained.

Assessment semantics remain conservative:

- positive evidence with no matching issue can establish `healthy`
- positive evidence plus findings produces the appropriate degraded risk state
- zero findings plus zero evidence remains `not-verified`
- third-party activity cannot establish first-party health

The verified 2026-08-17 full-matrix run produced 22 API endpoint records and two backend services with zero API/backend release gaps.

---

## Discovery signal filtering

Modern web applications generate browser activity that does not automatically represent a product defect.

QA Sentinel Tyra therefore filters and reclassifies signals such as:

- expected aborted browser requests
- framework navigation activity
- Next.js / RSC request behaviour
- media requests aborted by navigation
- analytics requests affected by CSP
- telemetry resources affected by CSP

The goal is not to hide failures.

The goal is to distinguish **actionable application problems** from **expected browser and framework noise**.

---

## Root-cause intelligence

Deep Discovery does not treat every repeated browser event as a separate defect.

Related findings are consolidated using fingerprints.

A consolidated finding can retain:

```text
fingerprint
occurrences
affectedRoutes
priorityScore
priority
```

For example:

```text
39 observations
9 affected routes
1 root-cause finding
```

This prevents the dashboard from presenting dozens of duplicate issues when the same underlying problem occurs repeatedly across an application.

---

## Priority intelligence

Discovery findings use a P0–P4 priority model:

| Priority | Meaning |
|---|---|
| P0 | Critical / immediate action |
| P1 | High priority |
| P2 | Significant issue |
| P3 | Lower priority / review |
| P4 | Informational |

Priority intelligence uses two related concepts:

### Priority score

`priorityScore` represents the strength and scope of a discovery signal.

The score can consider:

- severity
- issue category
- number of affected routes
- critical application routes

### Actionable priority

`priority` represents the final P0–P4 classification.

Severity guardrails prevent scope alone from incorrectly escalating low-severity findings into release-level priorities.

For example, a low-severity issue may have:

```text
priorityScore: 76
priority: P3
```

The higher score communicates that the issue is widespread or affects important routes, while the P3 guardrail preserves the fact that the underlying signal is still low severity.

This separates **signal strength** from **action urgency**.

---

## Scope intelligence

QA Sentinel Tyra distinguishes between:

```text
occurrences
```

and:

```text
affectedRoutes
```

`occurrences` measures how many times a signal was observed.

`affectedRoutes` measures how widely the underlying problem is distributed across the application.

This distinction prevents repeated events on a single route from receiving the same significance as a root cause affecting many independent user flows.

---

## Critical-route intelligence

Not every application route has equal business or user impact.

Deep Discovery can apply additional weight when findings affect important user flows such as:

```text
/signin
/signup
/profile
/assessment
/path
/skills
/practice
```

Other routes may receive a smaller importance weight.

Critical-route weighting is deliberately bounded and combined with severity guardrails so that route importance cannot independently turn a low-severity observation into a critical release blocker.

---

## Unified Issue Queue

QA Sentinel Tyra consolidates source-aware findings into a unified quality model:

```text
Playwright test issues
Deep Discovery findings
API and backend issues
            ↓
    Unified Issue Queue
            ↓
Cross-layer correlation
            ↓
   Unified Decision v5
```

The unified queue is written to:

```text
dashboard/data/unified-issues.json
```

Each finding retains provenance such as source identity, test links, requirement links, critical-flow links and affected scope. This lets later analyzers correlate evidence without treating every source as the same kind of failure.

The queue now feeds the completed Milestone 5 quality-intelligence framework and the advisory Milestone 6 workflow. It is no longer only a foundation for a future dashboard or release model.

---

## Cross-browser and profile intelligence

QA Sentinel Tyra now separates the browser engine from the execution profile.

Browser families are normalized into:

```text
Chromium
Firefox
WebKit
```

Execution profiles are tracked independently:

```text
Desktop
Mobile Chrome
Mobile Safari
Tablet
```

This prevents device profiles such as Tablet from being treated as browser families and makes cross-environment reporting more accurate.

The reporting model now provides both a **Browser Matrix** and a **Profile Matrix**.

### Cross-browser actionable issue deduplication

A single underlying defect can fail across several Playwright projects, browsers and profiles. QA Sentinel Tyra consolidates those repeated failures into actionable issues instead of presenting every failed execution as a separate defect.

Consolidated test issues can retain:

```text
fingerprint
occurrences
affectedProjects
affectedBrowsers
affectedProfiles
affectedSites
sourceTestIds
rootCause
confidence
recommendation
userImpact
```

This preserves the full impact scope while keeping one root cause as one actionable issue. Release assessment can therefore reason about consolidated issues instead of artificially inflating issue counts because the same defect reproduced in multiple environments.

---

## Reports

Every completed run can produce multiple views of the same canonical quality data.

### Live dashboard

The live dashboard exposes:

- Unified Decision release readiness and evidence state
- live Sentinel AI summary, root-cause, impact, recommendation and next action
- positive API/backend and compatibility evidence state
- quality, health and pass/fail metrics
- product, content and automation findings
- quality-dimension assessments
- browser, profile and performance intelligence
- prioritized and unified issue views
- historical run data
- advisory Autonomous QA assessment

### Dashboard data

The reporter writes the current run and supporting queues to:

```text
dashboard/data/latest-run.json
dashboard/data/history.json
dashboard/data/issues.json
dashboard/data/unified-issues.json
```

`history.json` stores prior runs. Milestone 6.7 uses the latest previous canonical schema-v5 run as a pairwise comparison baseline. If no valid baseline exists, the result is `no-baseline`; the analyzer does not claim a multi-run trend.

### Discovery reports

Deep Discovery produces structured site-specific reports under:

```text
reports/discovery/
```

These reports contain discovered routes, findings, consolidated root causes, prioritized findings and sanitized positive first-party API/backend evidence.

### Executive HTML report

QA Sentinel Tyra generates a styled executive report:

```text
reports/latest-report.html
```

When the dashboard server is running:

```text
http://127.0.0.1:4173/reports/latest-report.html
```

### Markdown report

A technical Markdown version is also generated:

```text
reports/latest-report.md
```

Generated runtime reports can be excluded from Git where appropriate so the repository remains clean.

---

## Project structure

```text
qa-sentinel-tyra/
├── config/
│
├── dashboard/
│   ├── data/
│   ├── command-center.css
│   ├── dashboard.css
│   ├── dashboard.js
│   ├── index.html
│   ├── sentinel-ai.css
│   └── site-health.css
│
├── docs/
│   └── assets/
│
├── reporters/
│   ├── analyzers/
│   ├── models/
│   ├── utils/
│   └── qa-dashboard-reporter.ts
│
├── reports/
│   └── discovery/
│
├── scripts/
│
├── tests/
│   ├── discovery/
│   ├── generated/
│   ├── nation/
│   └── skills/
│
├── utils/
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── README.md
```

---

## Release-readiness intelligence

QA Sentinel Tyra evaluates more than the raw number of failing tests. Quality-dimension assessments and cross-layer evidence feed the canonical Unified Decision model, which produces the schema-v5 release assessment.

The canonical output is identified by:

```text
schemaVersion: 5
releaseDecisionSource: 'unified-v5'
```

The legacy release assessment remains available as comparison telemetry, but it is not the canonical release authority. Cross-browser duplicates are consolidated before actionable issue counts are evaluated, preventing the same root cause from being counted repeatedly because it reproduces in several environments.

Milestone 6 can recommend investigation or verification work, but it cannot automatically change the release decision.

Post-M6 positive API/backend evidence now participates in the canonical release assessment. Missing evidence remains a verification gap, while successful current-run first-party evidence can remove that gap without hiding promoted API or backend issues.

---

## Milestone 5 — Quality Intelligence Framework

Milestone 5 was completed on **2026-08-13**.

| Delivery | Result |
|---|---|
| 5.1 Quality Intelligence Foundation | Shared evidence and assessment foundation |
| 5.2 Requirements & Functionality | Requirement and acceptance-criteria intelligence |
| 5.3 Critical Flows | Critical-flow and scenario intelligence |
| 5.4 UX/UI | User-experience and interface quality intelligence |
| 5.5 Security & Performance | Security and performance assessment |
| 5.6 Compatibility | Browser, profile and compatibility assessment |
| 5.7 API & Backend | API and backend issue intelligence |
| 5.8 Cross-layer Correlation | Correlated evidence across quality layers |
| 5.9 Unified Scoring & Decisioning | Canonical schema-v5 release authority |

Unified Decisioning reuses the established priority and evidence semantics across layers. Legacy release telemetry remains available for comparison.

---

## Milestone 6 — Advisory Autonomous QA Framework

Milestone 6 was completed on **2026-08-17**.

| Delivery | Advisory result |
|---|---|
| 6.1 Foundation | Autonomous QA assessment and advisory candidate model |
| 6.2 Risk-based Test Selection | Logical-test candidates linked to existing risk and provenance |
| 6.3 Execution Planning | Ordered advisory phases and test steps |
| 6.4 Failure Reproduction | Evidence-linked reproduction recipes for current failures |
| 6.5 Verification Planning | Plans remain `awaiting-new-evidence` until new results exist |
| 6.6 Change Impact Analysis | Potential impact is identified but never claimed as confirmed |
| 6.7 Quality Drift Comparison | Current run compared with the latest prior canonical schema-v5 run |
| 6.8 Investigation Planning | Cases and root-cause hypotheses for changed or potential-regression signals |

### Milestone 6 safety contract

- `executionEnabled` remains `false`.
- Candidate actions and plans remain advisory-only and `executable: false`.
- No Playwright tests or shell commands are launched by the analyzers.
- No remediation is authorized or applied.
- No automatic release-decision update is allowed.
- Verification requires new evidence; a plan is not proof of a pass or resolution.
- Change impact, quality drift and root cause remain explicitly unconfirmed.
- Existing Unified Decision, P0–P4 priority and evidence semantics are reused; Milestone 6 introduces no competing weighted score.

---

## Issue intelligence

Findings can be separated into categories such as:

- Product bug
- Content bug
- Automation issue
- Accessibility issue
- Performance issue
- Security issue
- Needs investigation
- Warning

This prevents every failed Playwright assertion or browser signal from automatically being treated as a production defect.

QA Sentinel Tyra is designed to preserve the difference between:

```text
test failure
product defect
automation problem
browser noise
security signal
performance signal
discovery observation
```

while still bringing actionable findings together for analysis.

---

## Performance intelligence

The reporter currently tracks metrics including:

- wall-clock duration
- average test duration
- median duration
- P95 duration
- fastest test
- slowest test
- slowest-test ranking

This creates a foundation for future regression detection and performance budgets.

---

## Roadmap

The authoritative roadmap is maintained in [`ROADMAP.md`](ROADMAP.md).

### Milestone 5 — Quality Intelligence Framework ✅

- requirements and functionality intelligence
- critical-flow intelligence
- UX/UI, security/performance and compatibility intelligence
- API and backend intelligence
- cross-layer correlation
- Unified Decisioning as the canonical schema-v5 release authority

### Milestone 6 — Advisory Autonomous QA Framework ✅

- risk-based logical-test selection
- advisory execution and failure-reproduction planning
- verification planning that awaits new evidence
- potential change-impact analysis
- pairwise quality-drift comparison
- advisory investigation cases and unconfirmed hypotheses

### Milestone 7 — Unified Dashboard Intelligence & Operationalization 🧭 PLANNED

Milestone 7 is defined in `ROADMAP.md` but has **not started**. Its planned scope completes operational test orchestration, presents the full advisory Autonomous QA assessment, deepens discovery-aware release readiness and works down the remaining UX/UI, security and performance verification gaps. Unified Decisioning remains the release authority and Autonomous QA remains advisory-only.

---

## Development workflow

After making changes, validate the exact scope before committing:

```bash
npm run typecheck
git diff --check
git status --short
git add <reviewed-files>
git diff --cached --check
git diff --cached --stat
git commit -m "Describe the change"
git push origin main
```

For Deep Discovery development:

```bash
npx playwright test tests/discovery/sentinel-discovery.spec.ts --project=nation-chromium --project=ai-skills-chromium
```

Milestone 6 analyzers must remain advisory. Running the normal project test commands is always an explicit developer action, never an Autonomous QA side effect.

---

## TYRA Labs

QA Sentinel Tyra is the first flagship developer tool in the planned **TYRA Labs** ecosystem.

| Project | Focus |
|---|---|
| **QA Sentinel Tyra** | Quality intelligence, Deep Discovery and Playwright reporting |
| **The World of Tyra** | Game development / adventure RPG |
| **Tyra DevOps Handbook** | AWS, DevOps, Terraform, CI/CD and security |
| **Tyra AI Assistant** | Planned AI productivity tooling |
| **Tyra Test Framework** | Planned reusable QA utilities |
| **Tyra Cloud Toolkit** | Planned cloud automation utilities |

**TYRA Labs:** *Building tools developers love to use.*

---

## Philosophy

Most test reporters answer:

> **What failed?**

QA Sentinel Tyra is being built to answer:

> **What happened, how serious is it, how widespread is it, what does it mean for the release, and what should we do next?**

That requires more than counting failed tests.

It requires understanding the difference between a test failure, an application defect, an infrastructure signal, expected browser behaviour and a repeated symptom of the same root cause.

That is the direction of QA Sentinel Tyra.

---

<p align="center">
  <strong>Quality First · Automate Everything · Ship with Confidence</strong>
</p>

<p align="center">
  Built as part of the TYRA Labs ecosystem.
</p>

## Project status — Milestones 5 and 6 complete; Milestone 7 planned

**Milestone 5 – Quality Intelligence Framework: ✅ COMPLETE**

Completed: 2026-08-13

**Milestone 6 – Advisory Autonomous QA Framework: ✅ COMPLETE**

Completed: 2026-08-17

**Verified post-M6 enhancements:**

- Sentinel AI intelligence is bound to the live dashboard.
- Positive first-party API/backend evidence participates in release readiness.
- The full configured compatibility matrix and API/backend evidence path were manually validated.

**Milestone 7 – Unified Dashboard Intelligence & Operationalization: 🧭 PLANNED — NOT STARTED**

- **Release authority:** Unified Decisioning v5
- **Dashboard schema:** v5
- **Legacy release assessment:** preserved as comparison telemetry
- **Autonomous QA:** advisory-only
- **Autonomous execution:** Intentionally disabled — advisory-only
- **Remediation authorization:** Intentionally disabled — advisory-only
- **Automatic release-decision updates:** Intentionally disabled — advisory-only
