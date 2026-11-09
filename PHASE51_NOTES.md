# ForestOS Phase 51 — Financial Governance Action Centre

## Delivered
- Owner-only API `GET /api/financial-action-centre?month=YYYY-MM&status=Open`.
- Owner-only update API `PATCH /api/financial-action-centre/:actionId`.
- New page `/financial-action-centre`, with action status, responsible person, action note and verification note.
- Generates separate action records from outstanding investigations and reconciliation records needing review when the monthly action list is opened.
- Preserves existing action progress during refresh using `$setOnInsert`.
- Requires a verification note before an action can be marked Completed.
- Stores action history for status changes and updates.

## Important boundaries
- This phase does not automatically resolve the original investigation or mark a reconciliation as reviewed. The action record is a separate management workflow.
- Responsible person is free text; this is not a user-account assignment.
- Due dates are displayed from source investigations; this page does not edit due dates.
- Completing an action records a verification note supplied by the user; it does not independently validate external evidence.
- Action creation uses bounded source queries and creates actions lazily on list access.
- Database-level uniqueness is defined for action IDs and source type/reference. Validate indexes and existing source data in the deployment environment.

## Verification
ZIP integrity and required-file presence checked during packaging. TypeScript compilation, database integration and browser/runtime tests have not been run.
