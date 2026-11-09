# Phase 174 — Live Cross-Tenant Registry Isolation Probe

## Scope
Adds an opt-in, read-only HTTP probe that checks two dedicated test tenants against configured GET endpoints. It verifies HTTP success, visible tenant-ID separation, expected test-record marker presence, and absence of the other tenant's marker. It does not modify data.

## Configuration
Set these environment variables only for a dedicated non-production environment:
- `FORESTOS_TEST_API_BASE_URL`
- `FORESTOS_TEST_TENANT_A_TOKEN`, `FORESTOS_TEST_TENANT_B_TOKEN`
- `FORESTOS_TEST_TENANT_A_ID`, `FORESTOS_TEST_TENANT_B_ID`
- `FORESTOS_TEST_TENANT_A_READ_PATH`, `FORESTOS_TEST_TENANT_B_READ_PATH`
- `FORESTOS_TEST_TENANT_A_RECORD_MARKER`, `FORESTOS_TEST_TENANT_B_RECORD_MARKER`

The two test tenants, tokens, and markers must be distinct. Each configured endpoint must return JSON containing its expected tenant ID and unique record marker, and must not return the other tenant's ID or marker. Endpoint paths must stay on the configured origin. The probe uses GET only, does not follow redirects, has a timeout and response-size ceiling, and never prints tokens or response bodies.

## Run
From the repository root:
```bash
node scripts/phase174-live-registry-isolation-contract-tests.js
node scripts/phase174-live-registry-isolation-probe.js
```
From `apps/api`:
```bash
npm run test:phase174:contract
npm run test:phase174:live
```

## Limitations
Missing configuration means no requests are made and the report remains NOT VERIFIED. A passing probe applies only to the configured read endpoints and visible markers; it does not verify writes, role-based access, every route, pagination, indirect data leaks, or the whole application. Use dedicated non-production accounts and test fixtures. never use production credentials or data. Production clearance still requires a production build, complete authorization review, and appropriate live integration tests.
