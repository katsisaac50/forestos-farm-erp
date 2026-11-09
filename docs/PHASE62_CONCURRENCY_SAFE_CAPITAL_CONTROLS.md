# Phase 62 — Concurrency-Safe Capital Controls

## Implemented
- Added `verifiedSpendUgx` to capital proposal records as a denormalised commitment counter.
- Spend review now accepts only records still in `submitted` status. Already verified/rejected records cannot be re-reviewed through the same route, preventing accidental double increments.
- Verification uses a single conditional MongoDB `findOneAndUpdate` to increment verified spend only when the new total remains within the approved proposal amount.
- Existing proposal records without the counter are initialised from existing verified spend records using a conditional update.
- The spend review records an audit event after the status change.

## Important operational limitations
1. This reduces the race where two concurrent verifications each observe the same remaining budget. It is not a full multi-document transaction: the proposal counter update and spend-record save are separate operations. A process crash between them can leave a reserved amount without a corresponding verified record. Production hardening should use MongoDB transactions on a replica set, with an idempotent reconciliation/repair job.
2. The legacy-counter initialisation reads verified spend records before atomically setting the missing field. Concurrent first-time initialisers are guarded by `verifiedSpendUgx: {$exists:false}`, but data migration and concurrent-write tests are still required before production.
3. Do not manually edit `verifiedSpendUgx`. Add an audited repair tool that recomputes it from verified spend records and flags mismatches.
4. Spend record creation remains a submitted evidence record; it does not make a payment or reserve approved budget until verification.
5. This phase does not implement pending-proposal budget reservations. Capital proposals that are merely proposed are not yet reserved against business-line budgets; the allocation dashboard should continue to be treated as indicative.
6. If a spend record needs correction after verification, use a future reversal/correction workflow rather than re-reviewing it in place.

## Release checks
- Test two concurrent verifications whose combined amount exceeds the remaining approved amount: only one must succeed.
- Test repeated review of a verified or rejected record: expect conflict.
- Test legacy proposal with no counter and pre-existing verified records.
- Test crash/retry behavior and counter-vs-ledger reconciliation.
- Test rejected spend does not increment the counter.
- Run API build and integration tests against the project's actual MongoDB deployment topology.

## Verification status
Archive integrity and expected-file checks only. TypeScript build, MongoDB integration, concurrency tests and runtime tests have not been run.