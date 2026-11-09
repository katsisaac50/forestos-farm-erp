# Phase 188 — Real Application Authentication Test Harness

Phase 188 adds an opt-in, read-only HTTP smoke probe for the actual running ForestOS API and a runtime/build prerequisite preflight. The HTTP probe targets `GET /api/auth/me` by default and checks that missing and invalid bearer tokens are rejected with HTTP 401. If a dedicated non-production valid token is explicitly supplied, it checks that the authenticated profile endpoint returns HTTP 200.

## Run source-level checks

From the project root:

```bash
node scripts/phase188-authentication-http-smoke-contract-tests.js
node scripts/phase188-runtime-build-preflight.js
```

## Run against a dedicated non-production API only

Start ForestOS API with a dedicated test database. Then configure:

```bash
export FORESTOS_ALLOW_HTTP_PROBE=YES
export FORESTOS_HTTP_PROBE_BASE_URL=http://127.0.0.1:4000
# Optional: a short-lived token issued for a dedicated test user
export FORESTOS_HTTP_PROBE_VALID_TOKEN='...'
node scripts/phase188-authentication-http-smoke.js
```

The probe only sends GET requests, disables redirects, enforces same-origin paths, limits response size and timeout, and does not print tokens or response bodies. Do not use production credentials or run against production. The valid-token check is skipped if no token is provided. A passing probe tests only the configured profile endpoint; it does not prove role-based access, login/setup behavior, MongoDB integrity, or tenant isolation.

## Validation status

Contract checks are source-level. Unless separately recorded, no NestJS build, live HTTP test, or MongoDB test has been executed. Production remains **NOT CLEARED** pending successful build, real runtime authentication/authorization tests, isolated database tests, and cross-tenant isolation evidence.
