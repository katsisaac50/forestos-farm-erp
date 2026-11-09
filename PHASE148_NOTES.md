# Phase 148 — Decision & Action Intelligence Engine

## Purpose
Convert findings from Phase 147 reconciliation, manually supplied findings, and selected operational metric thresholds into prioritized, dated action proposals. This phase is advisory: it does not assign a named person, execute a task, modify source data, or close an issue.

## Input schema
The JSON input can contain:
- `generatedAt`: optional `YYYY-MM-DD` report date.
- `reconciliationReport`: optional Phase 147 report object; its `issues` array becomes findings. A `blocked` report creates an explicit blocking finding.
- `findings`: optional array of finding objects, each with a required `code`; optional fields include `severity`, `priority`, `source`, `metric`, `message`, `spread`, and `tolerance`.
- `metrics`: optional thresholds for `overdueTasks`, `criticalUnverified`, `highSeverityInspectionIssues`, `survivalRate` with `minimumSurvivalRate`, and `activeColonies` with `minimumActiveColonies`.
- `actionTemplates`: optional object keyed by finding code. Template fields can include `title`, `action`, `priority`, `domain`, `ownerRole`, and non-negative integer `dueDays`.

Known finding codes have built-in advisory templates. Unknown codes receive a safe generic recommendation and are listed in `summary.unknownFindingCodes`. The engine deduplicates identical action IDs, sorts by priority and due date, and generates deterministic IDs from the finding identity.

## Run
From the repository root:
```bash
node scripts/phase148-decision-action-intelligence-engine.js --input=decision-input.json --output=decision-report.json --now=2026-10-29
node scripts/phase148-decision-action-intelligence-engine-contract-tests.js
```
Or from `apps/api`:
```bash
npm run decide:phase148 -- --input=../../decision-input.json --output=../../decision-report.json --now=2026-10-29
npm run test:phase148:contract
```
The CLI exits with code `2` when `decisionStatus` is `urgent_attention`, and `1` for input/CLI errors. Exit code 2 is a triage signal, not a system crash.

## Decision semantics
- `no_actions_required`: no action proposals were produced by the supplied checks.
- `actions_recommended`: one or more non-critical proposals exist.
- `urgent_attention`: reconciliation is blocked or at least one proposed action is critical.

Priorities are critical, high, medium, and low. Due dates are suggestions based on a deterministic date and default template window; an authorized manager must validate feasibility and risk. Default owner labels are roles, not actual assignments.

## Safety and limitations
This is an offline JSON decision-support utility. It does not connect to MongoDB, production dashboards, notification systems, or task-management APIs; it does not automatically consume Phase 147 output unless the reconciliation report is included in the input JSON. It does not establish root cause or decide whether a field action is safe. Forestry and apiary recommendations require on-site judgement, appropriate PPE and local procedures. Verify all recommendations, assign an accountable person, and approve controls before execution. Never treat an automatically generated action as proof that a problem occurred or was resolved.
