<p align="center">
  <img src="docs/assets/qa-sentinel-tyra-banner.png" alt="QA Sentinel Tyra" width="100%" />
</p>

<h1 align="center">QA Sentinel Tyra Enterptrise <h1>

<p align="center">
  <strong>Enterprise Quality Intelligence for Playwright</strong><br/>
  Live dashboards, intelligent issue classification, release readiness, performance insights and executive reporting.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Playwright-Test-2EAD33?logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Reports-HTML%20%2B%20Markdown-7B61FF" alt="Reports" />
  <img src="https://img.shields.io/badge/Dashboard-Live-00C2FF" alt="Live Dashboard" />
</p>

---

## What is QA Sentinel Tyra?

QA Sentinel Tyra is a custom Playwright quality-intelligence layer built to turn raw automated test results into information that is easier to understand and act on.

Instead of stopping at **passed** or **failed**, QA Sentinel Tyra adds:

- quality and health scoring
- release-readiness assessment
- issue classification
- severity and priority analysis
- browser and category statistics
- performance analysis
- historical trend data
- live dashboard reporting
- executive HTML reports
- technical Markdown reports

The goal is simple: **Quality First. Automate Everything. Ship with Confidence.**

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
| Prioritized issue queue | ✅ |
| Historical run data | ✅ |
| Executive HTML report | ✅ |
| Markdown report | ✅ |
| Playwright HTML report link | ✅ |
| AI-assisted root-cause intelligence | 🚧 Planned |
| PDF executive reports | 🚧 Planned |
| GitHub Actions integration | 🚧 Planned |
| Multi-project dashboard | 🚧 Planned |

---

## Architecture

```text
Playwright Tests
      │
      ▼
QA Sentinel Reporter
      │
      ├── Statistics Analyzer
      ├── Severity Analyzer
      ├── Category Analyzer
      ├── Health Analyzer
      ├── Performance Analyzer
      ├── Attachment Analyzer
      └── Issue Classifier
      │
      ▼
Quality Intelligence Model
      │
      ├── latest-run.json
      ├── issues.json
      └── history.json
      │
      ├───────────────┬────────────────┐
      ▼               ▼                ▼
Live Dashboard   Executive HTML   Markdown Report
                                      │
                                      ▼
                               Technical / GitHub use
```

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
npx tsc --noEmit
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

Generated runtime reports are intentionally excluded from Git so the repository stays clean.

---

## Project structure

```text
qa-sentinel-tyra/
├── dashboard/
│   ├── data/
│   ├── dashboard.css
│   ├── dashboard.js
│   └── index.html
│
├── reporters/
│   ├── analyzers/
│   ├── models/
│   ├── utils/
│   └── qa-dashboard-reporter.ts
│
├── reports/
├── scripts/
├── tests/
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

QA Sentinel Tyra evaluates more than the raw number of failing tests. The reporter can combine test outcomes with classified findings to produce a release assessment containing:

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

---

## Issue intelligence

Findings can currently be separated into categories such as:

- Product bug
- Content bug
- Automation issue
- Accessibility issue
- Performance issue
- Security issue
- Needs investigation
- Warning

This prevents every failed Playwright assertion from automatically being treated as a production defect.

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

## TYRA Labs

QA Sentinel Tyra is the first flagship developer tool in the planned **TYRA Labs** ecosystem.

| Project | Focus |
|---|---|
| **QA Sentinel Tyra** | Quality intelligence and Playwright reporting |
| **The World of Tyra** | Game development / adventure RPG |
| **Tyra DevOps Handbook** | AWS, DevOps, Terraform, CI/CD and security |
| **Tyra AI Assistant** | Planned AI productivity tooling |
| **Tyra Test Framework** | Planned reusable QA utilities |
| **Tyra Cloud Toolkit** | Planned cloud automation utilities |

**TYRA Labs:** *Building tools developers love to use.*

---

## Roadmap

### Milestone 1 — Foundation ✅

- Playwright integration
- custom reporter
- dashboard
- release readiness
- issue classification
- HTML reports
- Markdown reports
- Git repository

### Milestone 2 — Presentation 🚧

- professional README
- project banner
- product identity
- screenshots
- architecture documentation
- GitHub presentation

### Milestone 3 — Product

- simplified setup
- reusable configuration
- package / CLI preparation
- report plugins
- PDF export
- GitHub Actions
- richer trend analytics

### Milestone 4 — TYRA Labs

- shared visual identity
- portfolio site
- documentation hub
- additional developer tools

---

## Development workflow

After making changes:

```bash
npx tsc --noEmit
npm run test:nation
git add .
git commit -m "Describe the change"
git push
```

---

## Philosophy

Most test reporters answer:

> **What failed?**

QA Sentinel Tyra is being built to answer:

> **What happened, how serious is it, what does it mean for the release, and what should we do next?**

---

<p align="center">
  <strong>Quality First · Automate Everything · Ship with Confidence</strong>
</p>

<p align="center">
  Built as part of the TYRA Labs ecosystem.
</p>
