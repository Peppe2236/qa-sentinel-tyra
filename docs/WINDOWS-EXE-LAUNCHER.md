# QA Sentinel Tyra Windows EXE and Desktop Workbench

QA Sentinel Tyra includes a Windows desktop launcher that opens the local **QA Sentinel Tyra Workbench** in an app-like Edge window while keeping the QA engine, dashboard server, report server and security actions inside the existing repository.

## Normal startup

Build the EXE:

```powershell
npm install
npm run build:exe
```

Launch it:

```powershell
.\dist\QA-Sentinel-Tyra.exe
```

A normal launch:

1. validates the local project requirements;
2. starts the dashboard on `127.0.0.1:4173`;
3. starts the local Workbench control API on `127.0.0.1:4174`;
4. opens one app-like QA Sentinel Tyra window;
5. **does not automatically start Full QA**;
6. keeps the Playwright report inactive until the operator requests it.

This makes desktop startup safe and predictable: opening the program is not the same action as launching a full scan/test matrix.

## Explicit automatic Full QA

Automatic Full QA at startup is opt-in:

```powershell
.\dist\QA-Sentinel-Tyra.exe --auto-test
```

Diagnostic startup:

```powershell
.\dist\QA-Sentinel-Tyra.exe --check
```

`--no-test` remains accepted for compatibility, but normal startup already behaves as a no-auto-test Workbench launch.

## Workbench navigation

The desktop Workbench provides these top-level views:

- **Dashboard**
- **Run Full QA**
- **Fast Chromium**
- **Security Modes**
- **Reports**
- **Playwright**
- **Accessibility**
- **Settings**

### Dashboard

The Dashboard exposes current metrics, project/run metadata, Quick Actions, System Status, Recent Runs and the Release Status pipeline:

```text
Build → Tests → Analysis → Report → Release Decision
```

The pipeline describes the current Workbench/run state. Existing old report files must not be treated as proof that a new current run has already reached the Report phase.

## Test target selection

Workbench actions support:

```text
Both sites
Nation only
AI Skills only
```

Fast Chromium maps to the existing site-scoped commands. Full QA keeps `qa:unattended` as the complete both-sites path; scoped site runs remain scoped evidence and must not be presented as full release verification.

## Playwright report — on demand only

The Playwright report server is not started during ordinary Workbench startup.

When the operator chooses **Open Playwright report**, Sentinel starts `scripts/serve-playwright-report.mjs` on `127.0.0.1:9323` and opens the report. The static report server itself does not launch another browser window.

## Language and appearance

English is the default Workbench language. Settings provides:

- English
- Swedish
- Simplified Chinese
- Hindi
- Spanish
- Arabic with RTL layout
- French

The selected language persists locally.

Selectable colour themes:

- Tyra Azure
- Emerald
- Amethyst
- Amber
- Rose
- Arctic

Theme choice is separate from Accessibility preferences.

## Accessibility

Accessibility has its own top-level navigation entry so it remains easy to find regardless of the current Workbench view.

Display preferences are local/presentation-only and do not modify QA evidence, Unified Decisioning, release readiness or security assessment semantics.

## Security Modes

The Workbench launches the existing guarded security modes:

- **Production Safe** — authorized, non-destructive checks
- **Staging Active** — allowlisted non-production targets with explicit active-mode opt-in
- **Manual Validation** — checklist/report workflow with no network requests

See [`PENTEST-SECURITY.md`](PENTEST-SECURITY.md) for the authorization and scope contract.

## EXE build pipeline and icon failsafe

The executable build is deliberately split into a RAW `pkg` build and a post-processing step.

```text
launcher source
      ↓
pkg
      ↓
QA-Sentinel-Tyra.raw.exe
      ↓
resedit --no-grow
      ↓
QA-Sentinel-Tyra.exe
      ↓
--check smoke verification
```

`resedit --no-grow` is used because `pkg` executables are sensitive to PE resource growth and shifted offsets.

The final-build helper:

1. applies the compact Tyra icon without growing the resource section;
2. runs the final executable with `--check`;
3. detects post-processing failure/corruption;
4. restores the verified RAW executable as `QA-Sentinel-Tyra.exe` if icon injection is unsafe.

The goal is simple: a custom icon must never be allowed to leave the user with a broken executable.

## Current Workbench assets

```text
dashboard/assets/qa-sentinel-tyra-workbench-header.png
dashboard/assets/qa-sentinel-tyra-icon.png
dashboard/assets/qa-sentinel-tyra.ico
dashboard/assets/qa-sentinel-tyra-compact.ico

dashboard/workbench-i18n.mjs
dashboard/workbench-v3.css
dashboard/workbench-v3.mjs
dashboard/workbench-v52.css
dashboard/workbench-v52.mjs
```

The README banner in `docs/assets/qa-sentinel-tyra-banner.png` uses the current Tyra artwork so the repository front page matches the current Workbench visual identity.

## Ports

| Service | Local port |
|---|---:|
| Dashboard / Workbench | 4173 |
| Workbench Control API | 4174 |
| Playwright report | 9323, on demand |

All Workbench control services are local to the machine.
