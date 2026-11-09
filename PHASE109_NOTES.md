# ForestOS Phase 109 — Fixture / Schema Alignment

## Purpose
Align the Phase 108 reproducible fixture data with the actual NestJS/Mongoose schema contracts before using those fixtures for live HTTP tenant-isolation tests.

## Changes
- Corrected the suspended-membership fixture's **User.role** from `viewer` to `field_worker`, which is allowed by `apps/api/src/auth/user.schema.ts`. The membership itself retains `role: viewer` and `status: suspended`, matching the membership schema.
- Added `scripts/phase109-schema-alignment-contract-tests.js`, a static check for required fields, enums, fixture role values, password hash conventions, and test-database guardrails.
- Added the Phase 109 contract test to the tenant-security regression workflow.

## Validation scope
The contract script reads source files only. It does not connect to MongoDB, instantiate the app's registered models, verify collection naming at runtime, log in through `/api/auth/login`, or run live HTTP isolation scenarios. Those remain necessary before enabling the optional live workflow. The seeder still defines lightweight Mongoose models with explicit collection names; runtime collection/model alignment should be confirmed in a dedicated test database.

## Run
```sh
node --check scripts/phase108-seed-test-fixtures.js
node --check scripts/phase109-schema-alignment-contract-tests.js
node scripts/phase109-schema-alignment-contract-tests.js
```
