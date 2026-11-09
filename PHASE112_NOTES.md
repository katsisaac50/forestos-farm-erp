# ForestOS Phase 112 — Model & Fixture Contract Audit

## Purpose
Make the boundary between application schemas and the Phase 108 fixture seeder explicit before enabling live tenant-security tests.

## Changes
- Added `scripts/phase112-model-fixture-contract-tests.js`, a dependency-free static contract audit.
- Added the audit to the tenant security regression workflow.
- Added an API npm script to run the audit from `apps/api`.

## Important limitation
This audit reads source files. It does **not** import the NestJS application, connect to MongoDB, verify MongoDB collection names at runtime, or prove that seeded records authenticate through the real API. The Phase 108 seeder declares lightweight Mongoose models with explicit collection names, so collection/schema compatibility must still be verified against a disposable test database and the real registered application models.

## Validation
Run from the repository root:
```bash
node scripts/phase112-model-fixture-contract-tests.js
node scripts/phase111-membership-reference-contract-tests.js
```
Before live testing, install the API dependencies, start the dedicated test MongoDB service, verify the effective collection names in the running application, seed only a database whose name includes `test` or `qa`, and run the Phase 110 readiness probe plus Phase 106 tenant HTTP scenarios using dedicated test accounts.

## Status
Static contract audit only. No live MongoDB, NestJS build, API authentication, or tenant-isolation integration test was run as part of this phase.
