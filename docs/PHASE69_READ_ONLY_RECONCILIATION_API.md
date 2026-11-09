# Phase 69 — Read-only Financial Reconciliation API

## Implemented endpoint
`GET /api/capital-spend-verification/reconciliation`

The endpoint is added to the existing owner-role protected capital spend controller. It reads bounded sets of spend and proposal records and returns a report with a run ID, as-of timestamp, source scan counts, partial-scan warning, per-proposal gross verified original spend, valid linked reversal total, calculated net spend, remaining approved amount, stored commitment counter, counter variance, and findings.

## Safety properties
- Read-only: does not change spend, proposal, or audit records.
- Bounded: scans at most 1,000 spend records and 500 proposals, with one extra row to detect truncation.
- Explicit partial status: the report flags truncation and warns that it is not a complete reconciliation.
- Reversal linkage: a reversal is counted only if the original and reversal linkage fields agree, including amount, proposal, original status and reversed-by pointer.
- Owner route protection inherits the controller's `@Roles('owner')` decorator and the application's existing auth guard.

## Known limitations
- This is an initial read-only report, not a repair executor.
- The scan is bounded and can produce duplicate-looking orphan findings when there are many records or a spend links to a proposal outside the scan window; use `isPartial` as a hard warning.
- The current historical reversal representation uses a rejected reversal record and a marker on the original; legacy rows may not meet all linkage requirements and are flagged rather than guessed.
- Gross originals are historical verified original records; reversal totals are shown separately; net spend is gross originals minus valid linked reversals.
- It does not use a database snapshot transaction for reads, so records can change during the scan. Treat the report as a point-in-time diagnostic, not a ledger close.
- No database integration tests or production build were run during packaging.
