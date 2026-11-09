# Transactional Financial Controls — Test Plan

## Unit tests
- DTO rejects unknown fields, malformed amounts, invalid dates, and missing reasons.
- State machine rejects invalid spend/reversal transitions.
- Derived net spend handles linked full reversals without double counting.
- Idempotency key replay returns the prior outcome without another write.

## MongoDB replica-set integration tests
- Verify two concurrent spends that together exceed the proposal cap; only a safe total may commit.
- Fail each write in turn and assert transaction rollback.
- Race two reversal requests against the same original; at most one reversal is committed.
- Modify source records after a dry-run; apply must reject the stale report.
- Force a retry after a simulated timeout; no duplicate monetary effect.
- Confirm audit event and financial records commit together.
- Verify backup/restore and indexes in a disposable database.

## Standalone MongoDB fallback tests (only if supported)
- Interrupt after each durable state transition.
- Restart recovery worker and verify convergence to a single consistent result.
- Replay recovery twice and assert idempotency.
- Verify unresolved states are surfaced and never silently treated as completed.

## Exit criteria
All tests pass in CI against a disposable database matching the intended deployment topology. Include a second-person review of accounting invariants and authorization checks before rollout.
