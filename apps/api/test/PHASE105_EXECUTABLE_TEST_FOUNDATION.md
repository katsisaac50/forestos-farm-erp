# Phase 105 — Executable Multi-Tenant Test Foundation

## Purpose
Adds a dependency-free, executable contract-test layer around the tenant membership and organization-scope controls introduced in earlier phases. It provides a quick regression signal without requiring a database, installing packages, or starting the NestJS API.

## Run
From the repository root:

```bash
node scripts/phase105-tenant-contract-tests.js
node scripts/phase104-membership-tenant-regression.js
node scripts/phase103-security-regression.js
```

## What is checked
- Membership schema role/status contract.
- Singular membership role normalization into the organization context.
- Organization scope helper references trusted context organization IDs.
- Presence of cross-tenant, suspended-membership, and role cases in the integration matrix.
- MongoDB/runtime prerequisites and negative cases are documented in the integration plan.
- Release-readiness workflow still contains API and web build steps.

## Important limitation
These are source-contract tests, not live HTTP/MongoDB integration tests. They do not prove that every controller or service enforces tenant isolation. The two-tenant runtime matrix still needs to be executed against a disposable test database with real authenticated API requests. TypeScript/API and frontend builds have not been run as part of this phase.
