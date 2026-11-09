# Phase 70 — Financial Reconciliation Dashboard & Discrepancy Management

## Added
- Web route: `/financial-discrepancies`.
- Calls the Phase 69 read-only endpoint `GET /api/capital-spend-verification/reconciliation`.
- Displays run ID, timestamp, scan counts, partial-scan warnings, totals and proposal-level financial values.
- Filters by severity and business line, plus text search.
- Expandable findings show the discrepancy code, message and linked spend record IDs.
- Adds navigation from the homepage.

## Safety
This is a read-only investigation screen. It does not mark findings as resolved, edit financial records, initiate payment, or apply repairs. Users should verify the underlying evidence before corrective action.

## Limitations
- No persistent case status or investigator notes are stored in this phase.
- It inherits the endpoint's bounded scan and non-snapshot read limitations.
- It must be tested in the actual Next.js app and against an isolated API/database before production use.
- The UI may show discrepancies arising from legacy rows; these require review rather than automatic correction.
