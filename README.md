<p align="center">
  <img src="docs/assets/qa-sentinel-tyra-banner.png" alt="QA Sentinel Tyra" width="100%" />
</p>

<h1 align="center">QA Sentinel Tyra Enterprise</h1>

<p align="center">
  <strong>Enterprise Quality Intelligence for Playwright</strong><br/>
  Live dashboards, deep discovery, intelligent issue classification, release readiness, performance insights and executive reporting.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Playwright-Test-2EAD33?logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Reports-HTML%20%2B%20Markdown-7B61FF" alt="Reports" />
  <img src="https://img.shields.io/badge/Dashboard-Live-00C2FF" alt="Live Dashboard" />
  <img src="https://img.shields.io/badge/Deep%20Discovery-Active-success" alt="Deep Discovery" />
</p>

---

## What is QA Sentinel Tyra?

QA Sentinel Tyra is a custom Playwright quality-intelligence platform built to turn raw automated test results and discovered application signals into information that is easier to understand, prioritize and act on.

Instead of stopping at **passed** or **failed**, QA Sentinel Tyra adds:

- quality and health scoring
- release-readiness assessment
- issue classification
- severity and priority analysis
- Deep Discovery
- automatic route exploration
- runtime, network and security signal analysis
- root-cause deduplication
- P0–P4 prioritization
- scope and critical-route intelligence
- browser and category statistics
- performance analysis
- historical trend data
- live dashboard reporting
- executive HTML reports
- technical Markdown reports

The goal is simple:

**Quality First. Automate Everything. Ship with Confidence.**

---

## Current capabilities

| Capability | Status |
|---|---|
| Playwright test integration | ✅ |
| Custom QA reporter | ✅ |
| Live web dashboard | ✅ |
| Automatic dashboard refresh | ✅ |
| Health score | ✅ |
| Release readiness | ✅ |
| Product/content/automation classification | ✅ |
| Severity analysis | ✅ |
| Category statistics | ✅ |
| Browser health | ✅ |
| Performance statistics | ✅ |
| Prioritized test issue queue | ✅ |
| Historical run data | ✅ |
| Executive HTML report | ✅ |
| Markdown report | ✅ |
| Playwright HTML report link | ✅ |
| Multi-site Deep Discovery | ✅ |
| Nation discovery support | ✅ |
| AI Skills discovery support | ✅ |
| Automatic route discovery and crawling | ✅ |
| Runtime signal detection | ✅ |
| Network failure analysis | ✅ |
| Security/CSP signal analysis | ✅ |
| Discovery noise filtering | ✅ |
| Root-cause fingerprinting | ✅ |
| Root-cause deduplication | ✅ |
| Occurrence tracking | ✅ |
| Affected-route tracking | ✅ |
| P0–P4 discovery prioritization | ✅ |
| Scope-aware priority scoring | ✅ |
| Critical-route weighting | ✅ |
| Severity priority guardrails | ✅ |
| Unified issue queue foundation | ✅ |
| AI-assisted root-cause intelligence | 🚧 In progress |
| Unified dashboard intelligence | 🚧 In progress |
| Discovery-aware release readiness | 🚧 Planned |
| PDF executive reports | 🚧 Planned |
| GitHub Actions integration | 🚧 Planned |
| Multi-project dashboard | 🚧 Planned |

---

## Architecture

```text
                         QA SENTINEL TYRA
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
          Playwright Tests               Deep Discovery
                 │                             │
                 ▼                             ├── Route crawling
       QA Sentinel Reporter                    ├── Runtime signals
                 │                             ├── Network signals
                 ├── Statistics Analyzer      ├── Security signals
                 ├── Severity Analyzer        └── Noise filtering
                 ├── Category Analyzer              │
                 ├── Health Analyzer                ▼
                 ├── Performance Analyzer    Finding Intelligence
                 ├── Attachment Analyzer            │
                 └── Issue Classifier               ├── Fingerprinting
                         │                           ├── Deduplication
                         │                           ├── Occurrences
                         │                           ├── Affected routes
                         │                           ├── Scope weighting
                         │                           ├── Critical routes
                         │                           └── Severity guardrails
                         │                                  │
                         └──────────────┬───────────────────┘
                                        ▼
                               Quality Intelligence
                                        │
                        ┌───────────────┼────────────────┐
                        │               │                │
                        ▼               ▼                ▼
                 Test Issues     Discovery Issues   Run Intelligence
                        │               │                │
                        └───────────────┼────────────────┘
                                        ▼
                               Unified Issue Queue
                                        │
                       ┌────────────────┼────────────────┐
                       ▼                ▼                ▼
                Live Dashboard    HTML / Markdown    Release
                                     Reports         Intelligence
```

The architecture intentionally keeps raw Playwright test outcomes and Deep Discovery findings separate until they reach the quality-intelligence layer.

This allows QA Sentinel Tyra to distinguish traditional test failures from discovered product, runtime, network and security signals before presenting them through a unified issue model.

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

### 5. Run the Nation test suite

```bash
npm run test:nation
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

QA Sentinel Tyra is being extended from separate test and discovery intelligence into a unified quality model.

The current foundation combines:

```text
Playwright prioritized issues
            +
Deep Discovery prioritized findings
            ↓
    Unified Issue Queue
```

The unified queue is written to:

```text
dashboard/data/unified-issues.json
```

Traditional Playwright issues and discovery findings retain their source identity so later intelligence layers can reason about them appropriately.

The next development phase will connect this unified model to:

- the live dashboard
- release-readiness intelligence
- executive reporting
- source-aware filtering
- priority filtering
- category filtering

---

## Reports

Every completed run can produce multiple views of the same quality data.

### Live dashboard

The live dashboard exposes:

- release readiness
- quality score
- pass/fail metrics
- product, content and automation findings
- browser health
- performance statistics
- failure distribution
- priority queue
- category health
- historical trends
- automated QA assessment

### Discovery reports

Deep Discovery produces structured site-specific reports:

```text
reports/discovery/
```

These reports contain discovered routes, findings, consolidated root causes and prioritized findings.

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

QA Sentinel Tyra evaluates more than the raw number of failing tests.

The reporter can combine test outcomes with classified findings to produce a release assessment containing:

- status
- risk
- confidence
- blocking issues
- non-blocking issues
- verdict
- recommended action

Example:

```text
Status: READY WITH WARNINGS
Risk: MEDIUM
Confidence: 90%
Blocking issues: 0
Verdict: The build is generally stable, but unresolved issues should be reviewed before release.
```

The next phase of development will extend this model so Deep Discovery findings can participate safely in release-readiness decisions through the unified issue architecture.

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

### Milestone 1 — Foundation ✅

- Playwright integration
- custom reporter
- live dashboard
- health scoring
- release readiness
- issue classification
- severity analysis
- performance intelligence
- HTML reports
- Markdown reports
- historical run data
- prioritized test issue queue
- Git repository

### Milestone 2 — Discovery Intelligence ✅

- multi-site Deep Discovery
- Nation discovery support
- AI Skills discovery support
- automatic route crawling
- runtime signal collection
- network failure analysis
- security and CSP signal analysis
- intelligent discovery noise filtering
- root-cause fingerprinting
- duplicate consolidation
- occurrence tracking
- affected-route tracking
- P0–P4 discovery prioritization
- scope-aware priority scoring
- critical-route weighting
- severity priority guardrails

### Milestone 3 — Unified Quality Intelligence 🚧

- unified issue queue foundation ✅
- combine Playwright and Discovery findings
- connect unified issues to the live dashboard
- source-aware issue presentation
- discovery-aware release readiness
- critical-flow intelligence
- richer root-cause analysis
- dashboard filtering by source
- dashboard filtering by priority
- dashboard filtering by category
- unified executive reporting

### Milestone 4 — Presentation

- professional GitHub presentation
- architecture documentation
- screenshots
- richer product documentation
- usage examples
- setup documentation improvements

### Milestone 5 — Product

- simplified setup
- reusable configuration
- package / CLI preparation
- report plugins
- PDF export
- GitHub Actions integration
- richer trend analytics
- regression intelligence
- configurable quality policies

### Milestone 6 — TYRA Labs

- shared visual identity
- portfolio site
- documentation hub
- additional developer tools

---

## Development workflow

After making changes:

```bash
npm run typecheck
npm run test:nation
git status
git add .
git commit -m "Describe the change"
git push origin main
```

For Deep Discovery development:

```bash
npx playwright test tests/discovery/sentinel-discovery.spec.ts --project=nation-chromium --project=ai-skills-chromium
```

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