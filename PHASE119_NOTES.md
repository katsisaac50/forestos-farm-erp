# ForestOS Phase 119 — Plantation Read-Only Tenant Isolation Probe

## Purpose
This phase adds a read-only live HTTP probe for the plantation list and plantation intelligence endpoints, plus source contract checks for the existing tenant-scoping implementation. It does not modify application authorization code.

## Run static checks
From repository root:

```bash
node scripts/phase119-plantation-tenant-contract-tests.js
node --check scripts/phase119-plantation-tenant-read-probe.js
```

## Run against a dedicated non-production API
Set these environment variables using test-only credentials and seeded fixture data:

- `FORESTOS_TEST_API_BASE_URL` — e.g. `http://127.0.0.1:4000/api`
- `FORESTOS_TENANT_A_TOKEN`, `FORESTOS_TENANT_B_TOKEN`
- `FORESTOS_TENANT_A_ORG_ID`, `FORESTOS_TENANT_B_ORG_ID`
- `FORESTOS_TENANT_A_PLANTATION_MARKER`, `FORESTOS_TENANT_B_PLANTATION_MARKER`

The markers must be unique block IDs present in the corresponding organization's seeded plantation data. Non-local targets are blocked unless `FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true`; use that override only for a secured, dedicated non-production environment.

```bash
node scripts/phase119-plantation-tenant-read-probe.js
```

## What is checked
- Tenant A and Tenant B can read `GET /plantations` and `GET /plantations/intelligence`.
- Each response includes that tenant's unique seeded marker.
- Each response excludes the other tenant's marker.
- When returned by intelligence, `organizationId` matches the selected organization.

The probe performs GET requests only; it does not create, update, or delete records. Use isolated test accounts and fixtures.

## Validation boundary
Source contract checks can confirm recognizable source patterns, not runtime behavior. The live probe has not been run in this build environment because no API endpoint, test credentials, or fixture IDs were supplied. Results apply only to these two endpoints and markers and do not prove whole-application tenant isolation or production readiness.
