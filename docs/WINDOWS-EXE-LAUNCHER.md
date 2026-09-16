# QA Sentinel Tyra Windows launcher

`QA-Sentinel-Tyra.exe` is a Windows launcher for the existing repository. It
does not replace Playwright or the QA implementation.

## What the launcher does

1. Finds the QA Sentinel Tyra project root.
2. Checks that Node.js, npm and the local Playwright package are available.
3. Runs `npm run qa:unattended` to scan both configured sites and execute the
   full browser/device matrix.
4. Starts the dashboard on `http://127.0.0.1:4173/`.
5. Starts the Playwright report on `http://127.0.0.1:9323/`.
6. Opens both pages in the default browser.
7. Stops both local servers when the launcher is closed with `Ctrl+C`.

A non-zero Playwright exit code can mean that the QA run found real product,
security or accessibility issues. The launcher still opens the generated
evidence when the report files exist.

## One-time requirements

Run these commands once in the project directory:

```powershell
npm install
npx playwright install chromium firefox webkit
```

## Build the EXE

```powershell
npm run build:exe
```

The result is written to `dist/QA-Sentinel-Tyra.exe`. Keep the executable in
the `dist` folder inside the project, or copy it to the project root.

## Diagnostic options

```powershell
dist\QA-Sentinel-Tyra.exe --check
dist\QA-Sentinel-Tyra.exe --no-test
```

- `--check` validates the local requirements without running tests.
- `--no-test` opens the most recently generated dashboard and report.

## Workbench mode (desktop control center)

The launcher now opens the dashboard in an Edge app window (`--app=http://127.0.0.1:4173/`) so Sentinel becomes the main desktop window instead of opening a normal browser tab first.

Current workbench behavior:
- starts the dashboard immediately
- opens a single app-like Edge window without the normal address bar
- starts the automatic QA run in the background after the workbench is visible
- keeps Playwright Report on demand — it is not opened automatically
- exposes local control actions for **Run full QA**, **Fast Chromium**, **Production Safe Security**, **Staging Active** and **Manual validation**
- publishes live launcher state to `dashboard/data/workbench-status.json`

The local control API is available only on the same PC at `http://127.0.0.1:4174/api/status`.


### Workbench v2 behavior

The Workbench is always visible near the top of the dashboard and uses the Tyra header artwork. The Playwright report server is **not started during normal launcher startup**. Selecting **Open Playwright report** starts `scripts/serve-playwright-report.mjs` on `127.0.0.1:9323` and then opens the report. This static server deliberately does not launch a browser on its own.

## Workbench v3 — menu-based desktop layout

Workbench v3 changes the desktop window from a long panel stack into a menu-based operator workspace.

The persistent top area contains:

- the existing Accessibility controls
- the QA Sentinel Tyra hero/banner artwork
- the primary navigation bar
- a compact live launcher/status strip

Primary views:

- **Dashboard** — essential health, release and decision information
- **Run Full QA** — full unattended QA action plus root-cause/autonomous advisory evidence
- **Fast Chromium** — fast two-site Chromium action
- **Security Modes** — Production Safe, Staging Active and Manual Validation plus security evidence
- **Reports** — Sentinel reports and detailed evidence panels
- **Playwright** — native Playwright report, started only on explicit operator action
- **Settings** — existing Sentinel settings page

The existing Accessibility implementation is preserved and remains globally reachable at the top of the Workbench. Keyboard arrow navigation is supported across the main menu tabs.

### EXE icon

Workbench v3 includes:

- `dashboard/assets/qa-sentinel-tyra-icon.png`
- `dashboard/assets/qa-sentinel-tyra.ico`

The icon uses an emerald/fantasy glow shield with a gold `T`.

`npm run build:exe` now builds the Windows executable and applies the `.ico` resource with `rcedit`. The icon step uses `npx --yes rcedit@4.0.1`, so the first icon-enabled build may need network access to fetch that utility.

### Workbench v3 static assets

- `dashboard/workbench-v3.css`
- `dashboard/workbench-v3.mjs`
- `dashboard/assets/qa-sentinel-tyra-workbench-header.png`
- `dashboard/assets/qa-sentinel-tyra-icon.png`
- `dashboard/assets/qa-sentinel-tyra.ico`

## Multilingual Workbench UI (V4)

Workbench supports Swedish plus English, Simplified Chinese (Mandarin UI), Hindi, Spanish, Standard Arabic and French. Swedish is the default. The language selector sits beside the global Accessibility controls and persists locally between starts. Arabic activates RTL layout.

Localization intentionally applies to the application chrome, navigation, actions, status messaging and common dashboard labels. Raw test names, finding payloads, technical evidence, URLs, code and generated report evidence remain source-native so localization cannot alter QA evidence semantics.


### Workbench V5.1 UI

- English is the default interface language.
- Language and colour theme selectors are located under Settings.
- Accessibility is a dedicated top-level navigation item between Playwright and Settings.
- The hero banner and navigation proportions are compacted to match the desktop-workbench target.
- Accessibility remains independent of the selected visual colour theme.
