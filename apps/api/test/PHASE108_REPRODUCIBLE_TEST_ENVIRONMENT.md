# Phase 108 — Reproducible Test Data & Environment

## Added
- `docker-compose.test.yml`: separate MongoDB 7 test service on port 27018 with a dedicated named volume.
- `scripts/phase108-seed-test-fixtures.js`: idempotent fixture seeder for two organizations, two active owner users, one suspended membership user, eucalyptus plantation records, and hive records.
- `apps/api/test/PHASE108_REPRODUCIBLE_TEST_ENVIRONMENT.md`: setup, safety, and cleanup instructions.

## Setup
From repository root:

```bash
docker compose -f docker-compose.test.yml --profile test up -d mongo-test
cd apps/api
npm install
cd ../..
export FORESTOS_TEST_MONGODB_URI='mongodb://127.0.0.1:27018/forestos_test'
export FORESTOS_TEST_FIXTURE_PASSWORD='Use-a-long-test-only-password-108!'
node scripts/phase108-seed-test-fixtures.js
```

The script uses Mongoose and bcryptjs from `apps/api/node_modules`. It refuses to run unless the database name contains `test` or `qa`; it never drops a database. Re-running updates only the deterministic Phase 108 fixture records. To remove those fixtures, run the same command with `--reset`.

## Important integration note
This phase creates database fixtures and prints IDs needed for HTTP scenarios. It does not assume which application route supports organization membership administration or how JWT claims and organization context are wired. After seeding, log in using the API's `/api/auth/login` route to obtain tokens, then configure Phase 106 scenarios with actual route paths and returned IDs. Do not point this environment at production.

## Environment contract smoke test
Run `node scripts/phase108-environment-contract-tests.js` to check that the separate MongoDB test service and safety guards remain present.
