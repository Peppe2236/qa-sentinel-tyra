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
