# Phase 170 — Runtime Authorization & Cross-Tenant Verification

## Purpose
Provide an opt-in, read-only HTTP probe for a dedicated test environment. It checks two distinct tenant identities against configured GET endpoints, verifies that returned tenant identifier fields do not visibly cross, and tests missing/invalid bearer token rejection.

## Configuration
Set these environment variables in a secure shell or CI secret store:
- `FORESTOS_TEST_API_BASE_URL` — API origin only (no credentials, query, or fragment).
- `FORESTOS_TEST_TENANT_A_TOKEN`, `FORESTOS_TEST_TENANT_B_TOKEN` — dedicated test-user tokens.
- `FORESTOS_TEST_TENANT_A_ID`, `FORESTOS_TEST_TENANT_B_ID` — distinct tenant IDs expected in responses.
- `FORESTOS_TEST_TENANT_A_READ_PATH`, `FORESTOS_TEST_TENANT_B_READ_PATH` — read-only GET paths on that same origin. Prefer endpoints whose JSON responses include tenantId/organizationId fields.

Run from repository root:
```bash
node scripts/phase170-runtime-authorization-contract-tests.js
node scripts/phase170-runtime-authorization-probe.js
```
Or from `apps/api`:
```bash
npm run test:phase170:contract
npm run probe:phase170:authorization
```

## Safety and interpretation
- Only GET requests are sent; no records are created or modified.
- Tokens and response bodies are not printed. The report includes statuses and findings, not secrets.
- Endpoint paths must stay on the configured origin; credentials and token query parameters are rejected.
- Missing and deliberately invalid bearer tokens are expected to return HTTP 401 or 403.
- Tenant checks require the response payload to expose recognized tenant identifier fields. A response without such fields fails rather than being treated as proof of isolation.
- This is a targeted probe, not a security certification. It does not verify write routes, all role policies, indirect data leakage, rate limits, or all application endpoints.
- Use dedicated non-production tenants and tokens. Never use production credentials.

## Validation status for packaged build
Contract tests and static syntax checks are run during packaging. Live HTTP checks are not run unless the required environment variables are explicitly configured.
