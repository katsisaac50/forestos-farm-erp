# Phase 106 — Live Multi-Tenant HTTP Test Harness

## Purpose
Introduces a configurable HTTP test runner that can exercise real authenticated requests against a dedicated ForestOS test API. Route paths, seeded record IDs, and expected status codes are intentionally configurable because routes differ by module and this phase does not guess which endpoint is safe to call.

## Safety
- Use a disposable test database and test-only users/tokens.
- The runner blocks non-local targets by default.
- Do not point this at production.
- The included scenario file is an example template and contains placeholder route names/IDs; replace them with real routes and seeded fixtures before execution.

## Configure
Example environment variables:

```bash
export FORESTOS_TEST_API_BASE_URL=http://127.0.0.1:4000/api
export FORESTOS_TENANT_A_TOKEN='test-token-a'
export FORESTOS_TENANT_B_TOKEN='test-token-b'
export FORESTOS_SUSPENDED_TOKEN='test-token-suspended'
export FORESTOS_TENANT_A_ORG_ID='test-org-a-id'
export FORESTOS_TENANT_B_ORG_ID='test-org-b-id'
```

Then edit `apps/api/test/phase106-live-tenant-scenarios.example.json` to use valid API routes and test fixture IDs, and run:

```bash
node scripts/phase106-live-tenant-http-tests.js
```

For a secured, non-production test environment that is not on localhost, explicitly set `FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true`. This should only be used after verifying the target is a dedicated test environment.

## Scenario fields
- `name`: readable test label.
- `method`: GET, POST, PUT, PATCH, or DELETE.
- `path`: route path relative to the API base URL.
- `tenant`: `A`, `B`, or `SUSPENDED`; selects the corresponding bearer token.
- `organizationHeader`: optional organization header value; `false` omits it.
- `body`: optional JSON request body.
- `expectedStatus`: list of accepted HTTP status codes.
- `expectBodyNotToContain`: optional response strings that must not appear.

## Current validation status
The harness is syntax-checked and its fail-closed configuration behavior is smoke-tested. Live HTTP scenarios have NOT been executed: valid test credentials, actual endpoint paths, and seeded IDs must be supplied in a test deployment. Passing selected scenarios is not proof of complete tenant isolation; extend the matrix to cover read/create/update/delete, exports, reports, aggregations, and nested references.
