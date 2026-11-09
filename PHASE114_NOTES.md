# ForestOS Phase 114 — Fixture Integrity Audit

## Purpose
Add a read-only database audit of Phase 108 test fixtures, beyond Phase 113's connectivity and collection-presence checks.

## What it checks
- Both expected Phase 108 organization slugs exist and are active.
- Three dedicated fixture user accounts exist and are active.
- Password hash fields are present without printing their values.
- Fixture memberships exist, store user and organization references as strings, and include active and suspended states.
- Memberships refer only to the known fixture users and organizations.

## Run
Install API dependencies, start the dedicated test MongoDB service, and seed the test database if necessary:
```bash
cd apps/api && npm install && cd ../..
docker compose -f docker-compose.test.yml --profile test up -d mongo-test
FORESTOS_TEST_MONGODB_URI='mongodb://127.0.0.1:27018/forestos_test' node scripts/phase108-seed-test-fixtures.js
FORESTOS_TEST_MONGODB_URI='mongodb://127.0.0.1:27018/forestos_test' node scripts/phase114-fixture-integrity-audit.js
```
Only use a disposable test database. The fixture seeder writes test records; the Phase 114 audit itself is read-only.

## Limitations
The audit reads database collections directly. It does not import the NestJS registered models, call the authentication endpoints, verify password login, or test tenant authorization. A passing result is fixture-integrity evidence only, not proof of application security.

## Validation status
The Phase 114 contract tests and JavaScript syntax checks are run in the source-contract pipeline. No live MongoDB connection or database audit was performed while packaging this phase.
