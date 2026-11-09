# Phase 66 — Financial Transaction Integrity & Reversal Reconciliation

## Purpose
This phase adds an explicit reconciliation/repair design for capital spending and reversals, plus regression-test scaffolding. It deliberately avoids silently rewriting financial history: discrepancies are reported first, and any repair must be reviewed, documented, and auditable.

## Critical accounting distinction
- **Gross verified spend:** sum of original verified spending records, including records later reversed.
- **Reversal total:** sum of valid, linked reversal records.
- **Net spend:** gross verified spend minus valid reversal total.
- **Proposal commitment counter:** a derived control value, not the authoritative ledger. It must be reconciled to net spend and should never be blindly trusted if a write sequence may have been interrupted.

These totals must be computed using stable linkage identifiers and explicit status/correction fields. Never infer a reversal solely from a negative amount or a matching supplier name.

## Integrity checks
1. Every reversal points to an existing verified original spend.
2. A spend cannot be reversed twice.
3. Reversal amount and business line match the original record under the approved full/partial reversal policy.
4. Every original's reversed marker and every reversal record agree.
5. A proposal's derived verified-spend counter equals the sum of valid net spend linked to that proposal.
6. Net spend cannot be negative.
7. Reconciled spend must not exceed the approved proposal amount.
8. Each discrepancy has a stable code, affected record IDs, observed values, proposed resolution, reviewer, reason, and resolution timestamp.
9. A repair operation must be idempotent: running it again without intervening changes should not create additional financial effects.
10. A report must show gross, reversals, net, and counter variance separately.

## Transaction strategy
Preferred: perform the reversal record, original reversal marker, proposal counter update, and audit event inside a MongoDB transaction on a replica set, with idempotency keys and unique indexes. If transactions are unavailable, implement a durable state machine/outbox with recovery jobs; do not pretend multiple independent writes are atomic.

## Implementation boundary in this phase
This package includes the specification and a regression test matrix. It does not silently alter existing production-like accounting behaviour because the current model/service implementation needs a careful schema and service review before safe transaction changes can be made. In particular, legacy records may lack stable reversal linkage or have counters backfilled from historical data.

## Required regression cases
- Verify spend then reverse it: net spend returns to the pre-spend amount.
- Attempt duplicate reversal: rejected without changing counters.
- Interrupt between each write boundary: recovery restores consistent state.
- Run reconciliation twice: second run produces no further changes.
- Reconcile multiple spends on one proposal, including a reversal.
- Reject a reversal with a mismatched proposal or business line.
- Reject a negative net total or a proposal overrun.
- Preserve the original spend and reversal history; no destructive deletion.
- Reject unauthorised users from report, repair, and review endpoints.
- Concurrently verify two spends whose sum exceeds the proposal: at most the allowed amount is accepted.
- Report source totals and derived counters with an explicit as-of timestamp.

## Deployment safety
Do not run any future repair command against live data until there is a verified backup, a tested restore, a dry-run report, an approved change record, and a second-person review. The system must preserve an audit record of every approved repair.
