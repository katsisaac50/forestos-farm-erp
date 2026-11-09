# Phase 159 — Idempotent Retry & Optimistic Write Safeguards

## Changes
- Resolve an already-committed batch before checking `expectedRevision`, so a legitimate retry remains idempotent even if later batches have advanced the tenant's store revision.
- Return the original batch's `toRevision` for idempotent retries rather than reporting the store's current revision as if the retried batch had just committed.
- Inspect conditional MongoDB write results and abort the transaction with `WRITE_VERSION_CONFLICT` when neither a matching update nor an upsert occurred.
- Add a source-level contract test covering retry ordering, revision semantics, write-result checks, tenant scoping, and transaction usage.

## Validation boundary
The contract test validates source-level invariants; it does not execute the service against MongoDB. A real NestJS build and live replica-set integration test remain outstanding because this environment does not provide installed API dependencies or a disposable MongoDB test URI. The source check must not be interpreted as proof of production readiness.
