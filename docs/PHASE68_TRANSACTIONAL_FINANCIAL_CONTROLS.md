# Phase 68 — Transactional Financial Controls: Implementation Blueprint

## Why this phase is intentionally conservative
Financial services in the existing codebase use multiple document writes in some workflows. Safely converting those flows requires reviewing the concrete Mongoose models, service methods, database topology, migration state, and authorization guards. This package adds an implementation blueprint and test contracts; it does not pretend a database transaction is implemented merely because the documentation describes one.

## Transaction boundary to implement
For a spend verification or reversal, the following changes should be committed together where MongoDB transactions are supported:
1. Validate the original spend and proposal linkage.
2. Confirm the spend state allows the requested transition.
3. Check the approved proposal amount and current derived net spend.
4. Create the reversal/verification event with a stable idempotency key.
5. Update original/reversal state and the proposal's derived counter.
6. Append an immutable audit event.
7. Commit only after every write succeeds.

If any step fails, abort the transaction. For standalone MongoDB deployments without transaction support, use a durable state machine/outbox and recovery worker; do not silently fall back to a sequence of uncoordinated writes.

## API contract proposed for implementation
- `GET /api/financial-reconciliation?proposalId=...`: owner-authorized read-only findings; response includes `runId`, `asOf`, `isPartial`, gross historical originals, reversal total, net spend, stored counter, calculated counter, variance and findings.
- `POST /api/financial-reconciliation/dry-run`: validates a proposed repair plan but changes no records.
- `POST /api/financial-reconciliation/:runId/approve`: records a second reviewer, reason and approval.
- `POST /api/financial-reconciliation/:runId/apply`: applies only the approved, unchanged plan, using idempotency and transactional/recoverable writes.
- `GET /api/financial-reconciliation/:runId`: retrieve the report and its audit history.

These are target contracts, not routes already implemented in this package.

## Safety requirements
- Owner-only or dedicated least-privilege financial roles, enforced server-side.
- Validate every body/query with DTOs and whitelist unknown fields.
- Require a reason and evidence reference for any correction.
- Use optimistic concurrency/version checks so a stale dry-run cannot overwrite newer records.
- Refuse ambiguous legacy records rather than guessing.
- Use a stable idempotency key; repeated requests must not duplicate monetary effects.
- Record old/new values, actor, reviewer, reason, report ID and timestamps.
- Log identifiers and outcomes, not secrets or payment credentials.
- Never delete original spend records to make a discrepancy disappear.

## Acceptance criteria
- Concurrent spends cannot push net spend beyond an approved amount.
- A duplicate reversal request changes no monetary totals.
- Simulated process failure either rolls back all transaction writes or is recoverable from a durable state.
- Reconciliation is read-only until an explicitly approved apply operation.
- A stale report cannot be applied after source records change.
- After apply, a fresh reconciliation confirms all invariants or leaves the discrepancy open.
- All sensitive actions are covered by permission tests.

## Honest status
This phase adds the blueprint and executable documentation checks only. The database-backed endpoint, transaction service, recovery worker, migrations, and MongoDB integration tests remain unimplemented. Do not deploy this phase as proof of transactional safety.
