# Branch protection for `main`

QA Sentinel Tyra cannot turn on GitHub branch protection through the API
unless the caller is a repository admin. Petter must do this once in the UI.

Required CI gate: **Typecheck and unit tests** (job `quality` in
`.github/workflows/qa-ci.yml`). Do **not** require live `qa:sites`,
`qa-matrix`, or Lighthouse — those jobs are `continue-on-error` against
nation.dev and would flake-block merges.

## Exact GitHub UI steps

1. Open [https://github.com/Peppe2236/qa-sentinel-tyra](https://github.com/Peppe2236/qa-sentinel-tyra).
2. Click **Settings**.
3. In the left sidebar, click **Rules** → **Rulesets** (newer UI) **or**
   **Branches** → **Add branch protection rule** (classic UI).

### Classic branch protection rule

4. **Branch name pattern:** `main`
5. Enable **Require a pull request before merging** if you want no direct
   pushes to `main` (optional, recommended).
6. Enable **Require status checks to pass before merging**.
7. Enable **Require branches to be up to date before merging** only if you
   want rebases before merge (optional).
8. Search status checks for:

   ```text
   Typecheck and unit tests
   ```

   That is the job `name:` in `qa-ci.yml`. If the list is empty, push this
   workflow to `main` once, open a test PR, then return here and select the
   check after it has run.
9. Do **not** add `Live Chromium both sites`, `Optional full 18-project matrix`,
   or `Lighthouse Nation + Skills`.
10. Leave **Require signed commits** off unless you already sign commits.
11. Click **Create** / **Save changes**.

### Rulesets (if the repo uses the new Rulesets page)

4. **New ruleset** → **Branch**.
5. Name: `main protection`.
6. **Enforcement status:** Active.
7. **Target branches:** include `main` (default branch).
8. Enable **Require a pull request before merging** (optional, recommended).
9. Enable **Require status checks to pass**:
   - Add check: `Typecheck and unit tests`
10. Save the ruleset.

## After it is on

- Direct pushes to `main` fail unless checks are green (if PR-only is on).
- Typecheck + analyzer unit tests remain the only required quality gate.
- Optional `workflow_dispatch` jobs stay informational.

A repository admin can confirm under **Settings → Branches** or
**Settings → Rules → Rulesets**.
