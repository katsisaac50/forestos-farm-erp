# Phase 175 — Cross-Tenant Write Protection & Mutation Integrity

Phase 175 adds an opt-in HTTP probe for one narrow scenario: Tenant A attempts to PATCH a dedicated Tenant B test fixture, then Tenant B re-reads the fixture to confirm its unique marker remains present. It writes `PHASE175_CROSS_TENANT_WRITE_PROTECTION_REPORT.json`.

## Safety requirements

Run only against a dedicated disposable non-production environment. The probe makes a real PATCH request and therefore may alter data if the API is vulnerable. It requires both `FORESTOS_TEST_ALLOW_MUTATIONS=YES` and `FORESTOS_TEST_ENVIRONMENT=disposable`. Use unique, disposable test records and a minimal harmless payload. never use production credentials, production data, or production endpoints.

Required environment variables:

- `FORESTOS_TEST_API_BASE_URL`
- `FORESTOS_TEST_TENANT_A_TOKEN`
- `FORESTOS_TEST_TENANT_B_TOKEN`
- `FORESTOS_TEST_TENANT_A_ID`
- `FORESTOS_TEST_TENANT_B_ID`
- `FORESTOS_TEST_TENANT_B_READ_PATH`
- `FORESTOS_TEST_TENANT_B_RECORD_MARKER`
- `FORESTOS_TEST_CROSS_TENANT_PATCH_PATH`
- `FORESTOS_TEST_CROSS_TENANT_PATCH_JSON` (JSON object string)
- `FORESTOS_TEST_ALLOW_MUTATIONS=YES`
- `FORESTOS_TEST_ENVIRONMENT=disposable`

Both paths must be same-origin relative paths or same-origin URLs without credentials or token query parameters. The PATCH endpoint must target the same dedicated Tenant B fixture returned by the read endpoint. Configure the fixture's marker to a unique immutable identifier in the JSON response.

## Run

From the project root:

```bash
node scripts/phase175-cross-tenant-write-contract-tests.js
node scripts/phase175-cross-tenant-write-protection-probe.js
```

Or from `apps/api`:

```bash
npm run test:phase175:contract
npm run test:phase175:live
```

## Interpretation and limits

A PASS applies only to this configured PATCH attempt and marker check. The probe expects 401, 403, or 404 for the unauthorized mutation and then verifies that the owner's marker is still visible. A denied HTTP status alone is not sufficient. This does not test DELETE, all mutation routes, role matrices, concurrency, or prove application-wide security. Missing configuration results in a safe skip and `NOT VERIFIED`, not a pass. The probe does not log tokens or response bodies.
