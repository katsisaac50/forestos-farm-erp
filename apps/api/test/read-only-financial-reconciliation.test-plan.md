# Read-only Financial Reconciliation API — Test Plan

Endpoint: `GET /api/capital-spend-verification/reconciliation`

1. Unauthenticated request is rejected by the global guard.
2. Non-owner request is rejected by role guard.
3. Owner request returns `readOnly: true`, `runId`, `asOf`, and bounded scan metadata.
4. A balanced proposal reports zero counter variance.
5. A valid reversal reduces net spend by the linked reversal amount.
6. Mismatched reversal pointer, proposal, amount, or original state produces a critical finding and is not counted.
7. Duplicate reversals for one original are reported.
8. A stored counter differing from calculated net spend is reported.
9. Net spend above approved amount is reported.
10. More than 1,000 spend rows or 500 proposals sets `isPartial: true`.
11. Before/after database counts and relevant documents are identical because the endpoint is read-only.
12. Confirm report values against manually calculated test fixtures.

These are tests to run against an isolated MongoDB database; they have not been executed as part of this packaging step.
