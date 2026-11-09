# Automated Financial Reconciliation — Test Plan

## Seed scenario
Use an isolated MongoDB replica set. Create a proposal approved for UGX 1,000,000, two verified spends for UGX 300,000 and UGX 200,000, and a linked full reversal for UGX 300,000. Expected net spend is UGX 200,000, remaining approval UGX 800,000, and derived commitment counter UGX 200,000. Report historical originals and reversals as separate columns so gross figures are not ambiguous.

## Cases
1. Balanced records and counter → no discrepancy.
2. Counter higher/lower than derived net → variance reported.
3. Orphan reversal, duplicate reversal, mismatched proposal or business line → critical discrepancy.
4. Net spend exceeds approved amount → critical discrepancy.
5. Negative counter or net spend → critical discrepancy.
6. Legacy records missing linkage → review state; no auto-repair.
7. Query limit truncation → report clearly says partial scan.
8. Reconciliation is read-only → database hashes/counts unchanged by dry-run.
9. Dry-run repeated twice → identical findings for unchanged source data, except run ID and timestamp.
10. Repair plan requires authorisation, reason and reviewer approval.
11. Repair retry after simulated interruption → no duplicate reversal or counter change.
12. Post-repair reconciliation → zero unexplained variance and all invariants pass.
13. Non-owner cannot run restricted exports or repair actions.
14. Audit log contains before/after values and links to the reconciliation run.

## Exit criteria
The database-backed implementation must pass all cases against disposable test data before any live-data rollout.
