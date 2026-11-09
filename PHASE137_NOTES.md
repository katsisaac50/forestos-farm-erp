# Phase 137 — Continuous Improvement Action Plan & Tracking

## Purpose
Adds a local JSON governance evaluator for tracking improvement actions from finding to closure, with ownership, priority, due-date and evidence checks.

## Input
Provide a JSON array or `{ "actions": [...] }`. Required fields: `actionId`, `title`, `sourceFinding`, `owner`, `priority`, `status`, `createdAt`, `dueAt`, and `successMeasure`. Statuses: `PROPOSED`, `APPROVED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

Optional fields include `progressPercent`, `completedAt`, `completionEvidence`, `effectivenessReviewId`, and `cancellationReason`.

## Commands
- `npm run test:phase137:contract`
- `npm run improvement:phase137:plan -- <input.json> [output.json]`
- Optional fixed-clock testing: append `--now 2026-10-27T12:00:00Z`.

## Governance checks
Duplicate IDs, missing fields, invalid priority/status/date, due date before creation, overdue or blocked work, critical open actions, completion evidence/date, late completion, missing effectiveness review, cancellation reason and progress consistency.

## Boundaries
Offline JSON only. This does not assign people, persist data, notify owners, approve work, or establish that evidence is authentic. A human owner remains responsible for priorities, escalation, and closure decisions.
