# Phase 115 — Live Authentication & Organization Membership Probe

## Purpose
Adds a read-only HTTP probe for the authentication and organization-access endpoints that are present in this repository. It verifies test-account login, bearer identity consistency, each account's active organization list, own-organization context resolution, cross-organization denial, and denial for a suspended membership.

## Run safely
Use a dedicated non-production API and three seeded test accounts only. The API URL should include `/api`.

```bash
FORESTOS_TEST_API_BASE_URL=http://127.0.0.1:4000/api \
FORESTOS_TEST_TENANT_A_EMAIL=phase108.owner.a@example.test \
FORESTOS_TEST_TENANT_A_PASSWORD='...' \
FORESTOS_TEST_TENANT_B_EMAIL=phase108.owner.b@example.test \
FORESTOS_TEST_TENANT_B_PASSWORD='...' \
FORESTOS_TEST_SUSPENDED_EMAIL=phase108.suspended@example.test \
FORESTOS_TEST_SUSPENDED_PASSWORD='...' \
FORESTOS_TENANT_A_ORG_ID='<test org A ObjectId>' \
FORESTOS_TENANT_B_ORG_ID='<test org B ObjectId>' \
node scripts/phase115-live-auth-membership-probe.js
```

For a secured non-local non-production target only, set `FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true`. Never point this probe at production. The script does not print passwords or bearer tokens and does not mutate application data.

## Scope and limits
- Calls `POST /auth/login`, `GET /auth/me`, `GET /organization-access/mine`, and `GET /organization-access/context`.
- Expected cross-organization and suspended-membership denial statuses are 403 or 404.
- This validates the membership/context endpoints only. The controller explicitly notes that domain endpoints must enforce context themselves; this probe does not establish full tenant isolation across every domain route.
- Live checks were not run as part of this package build because no running API/database or credentials were supplied. Static contract checks are not a substitute for integration testing.
