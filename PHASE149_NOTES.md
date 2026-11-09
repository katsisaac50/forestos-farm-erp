# Phase 149 — Corrective Action Lifecycle & Verification Engine

## Purpose
Maintain an offline JSON lifecycle ledger for corrective actions: proposal, assignment, work in progress, evidence capture, independent verification, ineffective outcomes, reopening, and cancellation. Each state change adds a deterministic history event.

## Input contract
Input JSON:
- `generatedAt`: optional run date in `YYYY-MM-DD`.
- `actions`: required array.
- New action fields: `actionId` (optional), `title` (required), `description`, `findingCode`, `priority`, `owner`, `ownerRole`, `createdAt`, `dueDate`, `sourceFinding`, `actor`.
- `events`: optional array of events per action, processed in order. Each event requires `type` and a non-empty `actor`; event types:
  - `assign`: requires `owner`; optional `ownerRole`.
  - `start`: move assigned/reopened/ineffective action into progress.
  - `add_evidence`: requires `description`; optional `reference` and `kind`.
  - `submit_verification`: requires in-progress status and at least one evidence item.
  - `verify_effective` / `verify_ineffective`: require pending verification and non-empty notes. Reviewer must differ from the submitter.
  - `reopen`: requires a reason after a verified or ineffective result.
  - `cancel`: requires a reason and a cancellable status.
- Imported action snapshots with a `history` field must include both `history` and `evidence` arrays.

## Status lifecycle
`proposed → assigned → in_progress → pending_verification → verified_effective`
Alternative paths include `pending_verification → ineffective → assigned/in_progress`, `verified_effective → reopened → assigned/in_progress`, and cancellation where permitted. An action is not considered effectively complete until an independent reviewer verifies it. Evidence metadata stores a description and optional reference; this utility does not copy or validate referenced files.

## Run
From repository root:
```bash
node scripts/phase149-corrective-action-lifecycle-verification-engine.js --input=capa-input.json --output=capa-ledger.json --now=2026-10-29
node scripts/phase149-corrective-action-lifecycle-verification-engine-contract-tests.js
```
Or from `apps/api`:
```bash
npm run capa:phase149 -- --input=../../capa-input.json --output=../../capa-ledger.json --now=2026-10-29
npm run test:phase149:contract
```

## Summary fields
Report includes action counts by status, open actions, effectively verified actions, ineffective/reopened counts, overdue open actions, event history, evidence metadata, and governance notes. Overdue means the due date is before the report date and the action is not effectively verified or cancelled.

## Limitations
This is an offline JSON ledger, not a production workflow service. It has no authentication, role permissions, concurrent-write locking, database transactions, immutable server-side audit log, file upload/storage, notifications, or scheduling. Deterministic IDs and event IDs are identifiers, not security signatures. Production deployment should add server-side authorization, validated evidence storage, audit retention, concurrency control, backups, and integrations. Dates are interpreted as calendar dates in UTC. Events cannot be backdated earlier than the run date. Authorized staff remain responsible for confirming safe and appropriate actions.
