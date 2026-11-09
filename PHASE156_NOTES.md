# ForestOS Phase 156 — MongoDB Transaction Reliability

## What changed
- Added a unique partial index for `(tenantId, kind, batchHash)` on batch commit ledger records. This strengthens duplicate-submission protection at the database layer.
- Added a real MongoDB integration test runner that instantiates the Phase 155 persistence service against isolated, randomly named collections.
- Added scenarios for successful commit/revision advance, idempotent retry, tenant isolation, stale revision rejection, record-version conflict rejection, and invalid-input non-persistence.
- Added a contract suite that checks the critical reliability guardrails and that the live test harness requires an explicit disposable test URI.
- Added package scripts:
  - `npm run test:phase156:contract`
  - `npm run test:phase156:mongodb`

## Run the contract suite
```bash
node scripts/phase156-mongodb-reliability-contract-tests.js
```

## Run real MongoDB integration tests
1. Install API dependencies and build:
   ```bash
   cd apps/api
   npm install
   npm run build
   ```
2. Provide a disposable MongoDB replica-set URI using `FORESTOS_TEST_MONGODB_URI`.
3. From the repository root, run:
   ```bash
   node scripts/phase156-mongodb-integration-tests.js
   ```

The integration runner creates and drops only uniquely named `phase156_*` collections in the URI you explicitly provide. Never point it at production data.

## Verification status
Static reliability contract tests can run without a database. The real MongoDB tests are intentionally opt-in and will skip unless `FORESTOS_TEST_MONGODB_URI` is set. They were not run against a live database in this environment. The API build also requires installed dependencies and is not claimed as verified here.
