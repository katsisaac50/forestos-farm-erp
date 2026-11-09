# ForestOS Phase 113 — MongoDB Runtime Preflight

## Purpose
Introduce the first explicit read-only runtime database probe to prepare for live integration testing.

## What it does
- Requires `FORESTOS_TEST_MONGODB_URI`.
- Refuses to connect unless the database name includes `test` or `qa`.
- Uses the API's installed Mongoose dependency.
- Connects and runs a MongoDB ping.
- Lists collections and checks for `organizations`, `users`, and `organizationmemberships`.
- Performs no writes, deletes, index changes, or fixture seeding.

## Run it
Install API dependencies first:
```bash
cd apps/api
npm install
cd ../..
docker compose -f docker-compose.test.yml --profile test up -d mongo-test
FORESTOS_TEST_MONGODB_URI='mongodb://127.0.0.1:27018/forestos_test' node scripts/phase113-mongodb-runtime-preflight.js
```
If the collections do not exist yet, use the Phase 108 fixture seeder only against the dedicated disposable test database, then rerun the preflight.

## Safety and limitations
The database-name check is a guardrail, not proof that the database is disposable. Confirm the URI and target environment before running. This script is read-only and does not create collections. Collection presence does not prove the app's actual Mongoose schemas match the fixtures, and it does not test login, organization authorization, or tenant isolation.

## Validation status
The script syntax and static contract are checked locally. No MongoDB server or API dependencies were available in this build environment, so no live connection was attempted.
