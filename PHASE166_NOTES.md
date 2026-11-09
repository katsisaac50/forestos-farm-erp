# Phase 166 — Transaction Fault Injection & Rollback Verification

## Purpose
Adds an opt-in live test that triggers a MongoDB storage-layer validation error on the second record of a batch. Because the service processes writes sequentially inside `session.withTransaction`, the test checks that the first write, batch ledger entry, and revision are all absent after transaction abort.

## Run contract tests
`node scripts/phase166-transaction-fault-injection-contract-tests.js`

## Run live test
1. Install API dependencies and build: `cd apps/api && npm install && npm run build`.
2. Use a disposable MongoDB replica set and set `FORESTOS_TEST_MONGODB_URI`, `FORESTOS_TEST_DATABASE_NAME` (must contain a standalone `test` marker and exactly match the URI database path), and `FORESTOS_TEST_ALLOW_WRITES=YES`.
3. From project root run `node scripts/phase166-transaction-fault-injection-integration-tests.js`.

The script creates two uniquely named collections with a strict validator, induces one storage-layer rejection, asserts rollback invariants, and drops only those generated collections. It does not run if prerequisites are absent. Never use production credentials or databases.

## Limitations
Static contract tests are not proof of runtime rollback. Live execution must be recorded separately. The test relies on MongoDB transactions, so a replica set or compatible sharded deployment is required.
