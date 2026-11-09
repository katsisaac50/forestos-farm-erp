# ForestOS Phase 50 — Financial Governance & Management Scorecard

## Delivered
- Added owner-only `GET /api/financial-governance?month=YYYY-MM`.
- Added a monthly scorecard UI at `/financial-governance` and a dashboard card.
- Aggregates investigation workload and overdue status, reconciliation records needing attention, receipt-reference gaps, duplicate-like ledger groups, statement matching status and average resolution time.
- Read-only: does not edit financial records, close investigations, or confirm statement matches.

## Interpretation and limitations
- This is an operational control scorecard, not an audited financial statement or proof of fraud.
- Missing receipt references and duplicate-like groups are prompts for investigation, not findings.
- Query caps are applied (1,000 investigations, 500 reconciliations, 2,000 ledger transactions, 100 imports, 5,000 statement rows); cap warnings appear when reached.
- Month filtering uses each record's month field for investigations/reconciliations/imports and UTC date boundaries for ledger transactions.
- Matching percentage excludes ignored rows and is calculated from rows returned for the selected month's imports.
- Resolution time uses closed investigations with creation and resolution timestamps.
- Review the query limits and metrics against the farm's real data before using this for formal reporting.

## Verification
Archive integrity and required-file checks were run when packaging. TypeScript compilation, database integration, and browser/runtime tests have not been run in this environment.
