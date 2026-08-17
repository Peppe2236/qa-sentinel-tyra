# QA Sentinel Tyra Roadmap

## Current state

QA Sentinel Tyra has completed both the **Milestone 5 Quality Intelligence Framework** and the **Milestone 6 Advisory Autonomous QA Framework**.

Earlier foundations — Playwright reporting, Deep Discovery, actionable issue consolidation and the Quality Command Center — provide the evidence consumed by these frameworks.

After Milestone 6, Sentinel AI was bound to the live dashboard and positive first-party API/backend verification evidence was integrated into canonical release readiness. These are verified post-M6 enhancements and do not retroactively change the completed M5–M6 scope.

## Decision authority and safety boundaries

- Unified Decisioning is the canonical release authority for dashboard schema v5.
- `releaseDecisionSource: 'unified-v5'` identifies the canonical decision path.
- The legacy release assessment remains available only as comparison telemetry.
- Autonomous QA is advisory-only: execution, remediation authorization and automatic release-decision updates remain intentionally disabled.
- Existing Unified Decision, P0–P4 priority and evidence semantics are reused; no competing weighted score is introduced.

## Milestone 5 – Quality Intelligence Framework ✅ COMPLETE

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

Unified Decisioning is the canonical schema-v5 release authority. Legacy release assessment remains available as comparison telemetry.

**Milestone 5:** ✅ COMPLETE

## Milestone 6 – Advisory Autonomous QA Framework ✅ COMPLETE

**Completed: 2026-08-17**

| Delivery | Completed advisory capability |
|---|---|
| 6.1 Advisory Autonomous QA Foundation | Advisory assessment, provenance and candidate-action model |
| 6.2 Risk-based Test Selection | Logical-test candidates based on existing risk, Unified Decision and provenance |
| 6.3 Advisory Execution Planning | Ordered phases and advisory test steps; execution remains disabled |
| 6.4 Advisory Failure Reproduction | Evidence-linked reproduction recipes for failed current-run tests |
| 6.5 Advisory Verification Planning | Verification plans remain `awaiting-new-evidence` |
| 6.6 Advisory Change Impact Analysis | Potential change impact without claiming confirmation |
| 6.7 Advisory Quality Drift Comparison | Pairwise comparison with the latest prior canonical schema-v5 run; `no-baseline` when unavailable |
| 6.8 Advisory Investigation Planning | Investigation cases and unconfirmed hypotheses for changed or potential-regression signals |

### Milestone 6 safety contract

- `executionEnabled: false`
- advisory actions and plans use `executable: false`
- analyzers launch no Playwright tests or shell commands
- remediation is not authorized or applied
- release decisions are not automatically updated
- verification requires new evidence
- potential impact, drift and root cause remain unconfirmed

**Milestone 6:** ✅ COMPLETE

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

## Remaining planned work

These capabilities remain part of the long-term direction. They are not silently treated as completed by Milestone 5 or Milestone 6 and have not yet been assigned to a new numbered milestone.

| Capability | Status | Direction |
|---|---|---|
| AI-assisted root-cause intelligence | 🚧 In progress | Sentinel AI is live; deepen evidence-grounded explanations without claiming unverified certainty |
| Unified dashboard intelligence | 🚧 In progress | Sentinel AI is bound; complete presentation of the advisory Autonomous QA assessment and remaining intelligence layers |
| Discovery-aware release readiness | 🚧 In progress | Positive API/backend evidence now participates; complete broader discovery provenance and decision presentation |
| PDF executive reports | 🚧 Planned | Add distributable executive PDF output |
| GitHub Actions integration | 🚧 Planned | Add CI execution, artifacts and quality-gate integration |
| Multi-project dashboard | 🚧 Planned | Expand dashboard support across several projects |

The first three items preserve the previously documented product direction. The post-M6 enhancements move them forward but do not silently mark the broader capabilities as complete.

## Milestone 7 – Unified Dashboard Intelligence & Operationalization 🧭 PLANNED

**Status: NOT STARTED**

Milestone 7 will turn the completed M5–M6 intelligence foundations into a more complete, operationally reliable product experience. No M7 implementation should begin until its first delivery is explicitly selected and audited.

| Planned delivery | Scope |
|---|---|
| 7.1 Operational Test Orchestration | Correct project-specific npm commands and preserve separate per-site scan output |
| 7.2 Unified Advisory Dashboard | Present the complete M6 `autonomousQaAssessment` without granting execution authority |
| 7.3 Discovery-aware Release Readiness | Complete positive/negative evidence provenance and canonical decision presentation |
| 7.4 UX/UI Verification Coverage | Add trustworthy evidence for currently unverified UX/UI areas |
| 7.5 Security Verification Coverage | Add explicit security checks and close evidence gaps without treating absence as health |
| 7.6 Performance Verification Coverage | Add configured thresholds and verified page/API/backend performance evidence |
| 7.7 Evidence-grounded Root-cause Intelligence | Deepen Sentinel AI and investigation explanations while retaining uncertainty labels |
| 7.8 Milestone Validation & Documentation | Full-matrix regression validation, schema review, safety audit and documentation refresh |

### Milestone 7 authority and safety contract

- Unified Decisioning v5 remains the only canonical release authority.
- Milestone 7 introduces no competing weighted score.
- Autonomous test execution remains intentionally disabled and advisory-only.
- Remediation authorization and automatic release-decision updates remain intentionally disabled.
- Test commands are launched only by an explicit developer or CI action.
- Positive health requires current, relevant evidence; absence of findings is never sufficient.
- First-party evidence remains sanitized and source provenance remains visible.
- Compatibility failures, promoted issues and uncertainty must not be hidden by positive evidence.

**Milestone 7:** 🧭 PLANNED — NOT STARTED
