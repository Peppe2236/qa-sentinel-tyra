QA SENTINEL TYRA — INSTALLATION & CURRENT RUN MODES
Updated: 2026-09-16

This file replaces the old "STEG 2: WEBSITE SCANNER" instructions. The project is now a full Quality Intelligence ecosystem and should NOT be copied into the old nation-playwright-tests folder.

============================================================
1. CLONE / OPEN THE PROJECT
============================================================

Repository:
https://github.com/Peppe2236/qa-sentinel-tyra

Preferred development environment:
- Windows 10/11
- Ubuntu on WSL
- VS Code + Remote - WSL
- Node.js 24

Clone:

git clone https://github.com/Peppe2236/qa-sentinel-tyra.git
cd qa-sentinel-tyra

If the repository already exists locally, open that repository directly. Do not copy scanner files into a separate legacy project.

============================================================
2. INSTALL DEPENDENCIES
============================================================

npm install
npx playwright install chromium firefox webkit

Create the local environment file:

cp .env.example .env

Only add credentials/keys that you actually use. Never commit .env.

Optional variables may include test accounts, LLM enrichment and captcha integration. Missing optional credentials must remain a verification gap or skipped capability — never invented test evidence.

============================================================
3. VERIFY THE LOCAL INSTALLATION
============================================================

npm run typecheck
npm run test:unit

Latest verified development validation (2026-09-16):
- 140 validation tests passed for the Security Modes v6 / Windows launcher changes.
- This is component/development validation, not a fresh full release-scope web QA decision.

============================================================
4. NORMAL QA RUN MODES
============================================================

Fast Chromium run for both Nation and AI Skills:

npm run qa:sites

Full unattended run (scan + full 18-project browser/device matrix + analyzers + human-review pack):

npm run qa:unattended

Matrix without a fresh scan:

npm run qa:matrix

Start dashboard:

npm run dashboard

Dashboard:
http://127.0.0.1:4173/

Playwright report (manual):

npm run report -- --host 0.0.0.0 --port 9323

============================================================
5. SECURITY / PENTEST MODES
============================================================

Security execution is intentionally separated from normal QA.

A) PRODUCTION SAFE
Authorized, non-destructive checks such as dependency audit, HTTP/security headers and TLS/certificate assessment:

QA_PENTEST_AUTHORIZED=true npm run qa:pentest:production

Optional ZAP Baseline:

QA_PENTEST_AUTHORIZED=true QA_PENTEST_ZAP=true npm run qa:pentest:production

B) STAGING ACTIVE
Active ZAP Full Scan is allowed ONLY for allowlisted NON-PRODUCTION staging targets configured in:

config/pentest.json

It requires both authorization and active-mode opt-in:

QA_PENTEST_AUTHORIZED=true QA_PENTEST_ACTIVE=true npm run qa:pentest:staging

Production domains are blocked from this mode.

C) MANUAL VALIDATION
OWASP-oriented checklist/report workflow for authentication, authorization, sessions, APIs and business logic:

npm run qa:pentest:manual

Manual Validation performs NO network requests.

Pentest report example:
reports/pentest/pentest-report.html

IMPORTANT:
Pentest evidence is intentionally isolated from Unified Decisioning. A pentest finding must not silently change release readiness until canonical evidence/correlation semantics are explicitly implemented and validated.

See:
docs/PENTEST-SECURITY.md

============================================================
6. WINDOWS EXE
============================================================

Build:

npm run build:exe

Output:

dist/QA-Sentinel-Tyra.exe

The 2026-09-16 verified build contains the separate security modes and the duplicate Playwright report-opening fix.

The requested dedicated QA Sentinel Tyra desktop workbench/control-center is the next launcher-interface evolution. It should keep Sentinel as the main window and expose Playwright/reports through explicit operator actions. Do not document that workbench as complete until a fresh validation confirms it.

The dist/ directory is build output and may be ignored by Git. Build the EXE locally from the committed source rather than relying on a committed binary.

See:
docs/WINDOWS-EXE-LAUNCHER.md

============================================================
7. OUTPUTS TO CHECK AFTER A RUN
============================================================

Dashboard data:
- dashboard/data/latest-run.json
- dashboard/data/history.json
- dashboard/data/issues.json
- dashboard/data/unified-issues.json

Reports can include:
- reports/latest-report.html
- reports/latest-report.md
- reports/human-review.html
- reports/executive-report.pdf
- reports/traceability.html
- reports/pentest/pentest-report.html

Discovery reports:
- reports/discovery/nation.json
- reports/discovery/ai-skills.json

============================================================
8. TRUST / SAFETY RULES
============================================================

- Sentinel must never claim more than the available evidence supports.
- NOT VERIFIED is not PASSED.
- Partial runs are not full release runs.
- Security observation != confirmed weakness != confirmed vulnerability.
- Production Safe is non-destructive.
- Staging Active is non-production + allowlist + explicit double opt-in.
- Manual Validation performs no network requests.
- Autonomous QA remains advisory-only.
- Production-changing actions remain human-controlled.

============================================================
9. DEVELOPMENT CHECK BEFORE COMMIT/PUSH
============================================================

npm run typecheck
npm run test:unit
git diff --check
git status --short

git add README.md ROADMAP.md README-INSTALL.txt
git diff --cached --check
git diff --cached --stat
git commit -m "Update QA Sentinel Tyra documentation for security modes and launcher"
git push origin main

Do not commit .env, credentials, generated secrets or private runtime evidence.
