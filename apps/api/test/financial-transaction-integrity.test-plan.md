# Financial Transaction Integrity — Regression Test Plan

## Test setup
Use a disposable MongoDB replica set for transaction tests. Seed a proposal with a known approved amount and a small set of spend records. Never use live farm records.

## Expected invariant examples
Given approved proposal = UGX 1,000,000:
- verified spend A = UGX 300,000
- verified spend B = UGX 200,000
- valid full reversal of A = UGX 300,000
- expected gross verified spend = UGX 500,000 (if gross means active original spend only, define that convention consistently); alternatively show historical gross originals = UGX 500,000 plus a separate reversed-original subtotal of UGX 300,000. Do not mix the two definitions in one metric.
- expected reversal total = UGX 300,000
- expected net spend = UGX 200,000
- expected derived commitment counter = UGX 200,000
- expected remaining approved amount = UGX 800,000

## Test groups
1. Happy path: submit → verify → reverse → reconcile.
2. Invalid transition: reverse draft/submitted/rejected record.
3. Duplicate reversal and idempotency-key replay.
4. Proposal/business-line linkage mismatch.
5. Amount overrun, negative net, malformed dates, missing reason.
6. Concurrency: simultaneous verifications and simultaneous reversal attempts.
7. Failure injection after each write boundary, followed by recovery.
8. Reconciliation dry run vs approved apply; second run has zero changes.
9. Access-control matrix for owner and non-owner roles.
10. Audit-event integrity and report totals vs raw source rows.

## Exit criteria
All tests pass against an isolated test database, no invariant is violated under concurrency/failure injection, and an independent reviewer signs off the migration/repair plan.
