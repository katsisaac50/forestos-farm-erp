# Phase 67 — Automated Financial Reconciliation & Recovery

## Status and scope
This phase introduces a safe, read-only reconciliation design and a local source-level validator. It does **not** connect to MongoDB, inspect live records, or apply financial repairs. It establishes the report contract and controlled recovery workflow before a database-backed service is implemented.

## Reconciliation report contract
Each run should include:
- stable run ID and `asOf` timestamp;
- proposal ID/code and approved amount;
- spend record IDs and statuses included in the calculation;
- original verified spend, linked reversal total, net spend;
- stored commitment counter and calculated counter;
- variance amount and severity;
- duplicate or orphan reversal links;
- whether any source query was truncated;
- a dry-run flag and reviewer state.

## Required calculations
- `netSpendUgx = eligibleVerifiedOriginalsUgx - validLinkedReversalsUgx`
- `counterVarianceUgx = storedCounterUgx - calculatedNetSpendUgx`
- `remainingApprovalUgx = approvedAmountUgx - calculatedNetSpendUgx`

Eligibility must be determined by stable spend IDs, proposal linkage, business line, valid status transitions, and explicit reversal links. Do not treat all rejected rows as reversals, and do not infer a reversal from negative amounts alone.

## Discrepancy severity
- **Critical:** calculated net spend is negative; counter is negative; a reversal is duplicated/orphaned; proposal spend exceeds approved amount; original/reversal state disagrees.
- **High:** stored counter differs from calculated net spend; a spend references a missing proposal; the same original has multiple reversal records.
- **Review:** legacy rows lack required linkage or timestamps, or the source set may be truncated.

## Safe recovery lifecycle
1. Run read-only dry-run against an isolated or approved read-only connection.
2. Export the report and record source IDs plus `asOf` timestamp.
3. Back up the database and verify restoration.
4. Have a second reviewer approve a specific correction plan.
5. Apply an idempotent repair using a MongoDB transaction where available, or a durable recovery/outbox pattern.
6. Re-run reconciliation and compare before/after results.
7. Write an audit event with actor, reason, old values, new values, report/run ID, and timestamps.
8. Close the discrepancy only after post-repair invariants pass.

## Implementation rules
- No automatic repair of ambiguous legacy records.
- Never delete original spend or reversal history to make totals match.
- Never trust a cached commitment counter as the ledger of record.
- Use explicit query limits and report truncation; a partial scan must not be presented as a full reconciliation.
- Require authorization and a reason for report export, repair approval, and repair execution.
- Make repair commands idempotent and safe to retry after interruption.
- Avoid logging secrets, bank credentials, or unnecessary personal information.

## Current limitations
This archive contains the report specification and tests-to-implement matrix only. The database-backed reconciliation endpoint, transaction service, dry-run execution against MongoDB, and repair executor are not implemented or tested in this phase.
