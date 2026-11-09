# Phase 164 — Transaction Integrity Integration Tests

## Purpose
Adds an opt-in MongoDB-backed integration harness for the registry persistence service. It checks rejected-batch non-persistence, multi-record commit/revision behaviour, stale revision handling, version conflict preservation, and idempotent retry identity.

## Run static contract tests

```bash
node scripts/phase164-transaction-integrity-contract-tests.js
```

## Run live tests (opt-in)

Requirements: install API dependencies, build the API, and point the environment at a disposable MongoDB replica-set database. Set:

- `FORESTOS_TEST_MONGODB_URI`
- `FORESTOS_TEST_DATABASE_NAME` (must contain a standalone `test` marker)
- `FORESTOS_TEST_ALLOW_WRITES=YES`

Then run:

```bash
node scripts/phase164-transaction-integrity-integration-tests.js
```

The harness creates random collection names and drops only those collections. Do not point it at production. The harness verifies that rejected operations leave no changes, but it does **not** force a storage-engine failure after the first write; therefore it is not by itself proof of rollback after a mid-transaction infrastructure failure. Run against a real replica set to verify actual transaction semantics.

## Validation status

Static source contract checks can pass without a database. The live integration suite requires the compiled API and an explicit test URI. Do not report live database behaviour as verified unless the live suite actually runs.
