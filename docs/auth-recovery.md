# Authentication recovery and missing QA coverage

A saved cookie file is now verified against the protected route in a fresh
browser context. Setup fails explicitly when the session is not reusable and
no configured login can repair it. A failed setup blocks its dependent matrix
projects; it does not count as completed coverage.

Nation and AI Skills require their established session-cookie names (including
chunked variants), a nonempty value, an applicable domain and path, and an
unexpired secure cookie with at least five minutes remaining (session cookies
are also accepted). This check is followed by live verification. Nation Dev
uses its existing `/profile` target without assuming a cookie name.

The three-site operator configuration is retained: Nation refresh uses `/jobs`,
Nation preflight uses `/home`, AI Skills uses `/my-pathway`, and Nation Dev uses
`/profile`. Run Integrity requires all three exact protected-session checks.
For Nation Dev manual refresh, use `node scripts/auth-refresh.mjs nation-dev`.

## Windows / Ubuntu in WSL

After applying this update, run from the existing Tyra directory:

```bash
npm run auth:skills:refresh:manual
npm run qa:preflight
```

Sign in in the dedicated QA Chrome window and finish on
`https://aiskills.nation.dev/my-pathway`. Keep the window open until Tyra
captures the candidate. Capture has a 10 minute deadline, a 30 second startup
deadline, and 10 second CDP command deadlines. Failure gives a diagnostic;
rerunning a stuck process indefinitely is unnecessary.

Chrome uses its own QA profile and automatically chooses an available loopback
DevTools port. Capture uses the browser websocket and `Target.getTargets`,
without `/json/list`. Only Chrome processes whose command line names the exact
dedicated QA profile can be restarted. Regular Chrome windows and processes
using other profiles are not selected. The dedicated QA window closes at the
end of capture; its profile is retained for later sign-in reuse.

Cookies applicable to the target host and that origin's localStorage are
exported to a candidate file. The saved auth state is replaced only after the
candidate opens the protected route in a new Playwright context. A failed
candidate is removed; the previous saved state remains. This Windows capture
does not export IndexedDB or sessionStorage. If an application requires those,
verification must fail rather than claim success.

Native Windows paths are supported directly; WSL paths are converted with
`wslpath`. Ordinary Linux without Windows interop gives a clear error for the
manual Windows capture. Automated credential setup still works wherever its
configured login is supported. MFA and identity-provider challenges remain
manual steps.

After all configured sessions are verified in preflight, run Full QA through
the normal workbench or `npm run qa:unattended`. Use the project and execution
counts actually listed by the local configuration. This change does not alter
the site or project matrix. A copy with 30 projects should still enumerate 30;
the upstream configuration used to build this update currently enumerates 20.

## Evidence semantics

Scope is read through an isolated Playwright list reporter, including actual
project dependencies and per-project planned test counts. Missing or skipped
executions are shown in the Run Integrity panel with project, count, cause and
action. A failed setup dependency is a confirmed cause; unverified preflight
auth alone is labelled a possible cause. Retry attempts do not inflate coverage,
and repeatEach executions remain distinct.

Product test failures count as executed evidence. Skips do not. Full counts do
not independently approve a release: the existing Unified Decision remains
the release authority. Refresh's setup run uses its own output directory and a
line reporter so it does not replace the last Full QA dashboard run.

Pentest scripts and modes are unchanged. No pentest is invoked by these changes.

## Validation

```bash
npm run typecheck
npm run test:unit
npx playwright install chromium
npx playwright test --config=playwright.auth-regression.config.ts
```

The regression configuration only uses a local HTTP fixture and no production
reporter. `QA_AUTH_TEST_CHROMIUM_PATH` can select an existing Chromium binary for
these regression tests. The Windows PowerShell/CDP lifecycle and the real Google
login must also be validated on Windows/WSL; local browser regressions cannot
prove that a particular Google account or remote application accepts a session.
