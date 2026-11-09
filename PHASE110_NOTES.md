# ForestOS Phase 110 — Live Database and Authentication Readiness

## What this phase adds
- `scripts/phase110-live-readiness-probe.js`: a non-mutating live HTTP probe for API liveness, process readiness, login for Tenant A / Tenant B / suspended-membership fixture account, and bearer identity via `/api/auth/me`.
- `scripts/phase110-live-readiness-contract-tests.js`: static checks for endpoints, safety guardrails, and scope limitations.
- CI runs the syntax and static contract checks; it does not run live requests against an external service.

## Before running the live probe
1. Use a dedicated non-production test deployment and test database.
2. Install the API dependencies and start the API using the project's documented environment configuration.
3. Seed fixtures with Phase 108's seeder against the dedicated database, using the exact fixture password set in `FORESTOS_TEST_FIXTURE_PASSWORD`.
4. Set `FORESTOS_TEST_API_BASE_URL` to the API base including `/api` (local example: `http://127.0.0.1:4000/api`).
5. Set:
   - `FORESTOS_TEST_TENANT_A_EMAIL=phase108.owner.a@example.test`
   - `FORESTOS_TEST_TENANT_A_PASSWORD` to the fixture password
   - `FORESTOS_TEST_TENANT_B_EMAIL=phase108.owner.b@example.test`
   - `FORESTOS_TEST_TENANT_B_PASSWORD` to the fixture password
   - `FORESTOS_TEST_SUSPENDED_EMAIL=phase108.suspended@example.test`
   - `FORESTOS_TEST_SUSPENDED_PASSWORD` to the fixture password

Run:
```sh
node --check scripts/phase110-live-readiness-probe.js
node scripts/phase110-live-readiness-contract-tests.js
node scripts/phase110-live-readiness-probe.js
```

The probe blocks non-local targets by default. Only set `FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true` when you have independently verified that the target is a dedicated, secured non-production environment. Never use production credentials or a production database.

## Interpretation and limits
The probe tests HTTP liveness, login, and bearer identity; it does not mutate data and does not print passwords or JWTs. The current `/api/health/ready` endpoint explicitly reports `database: not_checked`, so a successful response is not proof of database readiness. The probe does not prove tenant isolation: that requires real, configured tenant-specific routes and negative cross-tenant scenarios in the Phase 106 HTTP harness. No live probe is claimed as passed by this source-only build.
