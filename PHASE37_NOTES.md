# Phase 37 — Inspection-to-Corrective-Action Workflow

## Added
- `POST /api/corrective-actions/from-inspection/:inspectionId` creates a corrective action from a persisted field inspection.
- Copies inspection findings/recommendation, block/location, and real inspection ID into the action.
- Requires an inspection in submitted, verified, or rejected state. Non-owner users can create actions only from inspections assigned to their login identifier; owners can use any eligible inspection.
- Requires assigned worker, priority and valid due date.
- Basic duplicate guard blocks a second unresolved action for the same inspection; a follow-up can be created after the earlier action is closed. This is an application-level check, not a race-proof database uniqueness guarantee.
- Corrective-actions page now has an explicit “Create action from inspection” form with preview of findings/recommended action. Existing manual creation remains available.

## API example
`POST /api/corrective-actions/from-inspection/<inspectionId>`
```json
{"priority":"high","assignedTo":"worker@example.com","dueAt":"2026-11-01T15:00:00.000Z"}
```

## Limitations / checks
- This endpoint creates an action only when explicitly requested; submitting an inspection does not automatically create one.
- Worker identifiers must match the account identifier used by the app.
- The duplicate check can race under simultaneous requests; a production-grade implementation should use a transaction or a modelled active-source key with a robust concurrency strategy.
- Archive structure and required source edits should be checked before use. No claim of successful build, runtime, or browser tests unless separately performed.
