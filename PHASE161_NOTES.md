# Phase 161 — Live API Tenant Isolation Probe

This phase adds an **opt-in, read-only HTTP probe** for a configured API GET endpoint using two distinct test-tenant bearer tokens. It checks that each response contains its own configured tenant identifier and does not contain the other tenant's identifier. It never prints tokens, database URIs, or response bodies.

## Contract checks

`node scripts/phase161-tenant-isolation-probe-contract-tests.js`

## Live probe configuration

Set all of the following only for a dedicated test environment:

- `FORESTOS_TEST_API_BASE_URL` — API origin, e.g. `http://127.0.0.1:3000`
- `FORESTOS_TEST_READ_PATH` — same-origin read-only GET path that returns tenant-scoped records and tenant identifiers
- `FORESTOS_TEST_TENANT_A_TOKEN` and `FORESTOS_TEST_TENANT_B_TOKEN` — separate short-lived test tokens
- `FORESTOS_TEST_TENANT_A_ID` and `FORESTOS_TEST_TENANT_B_ID` — the expected, distinct tenant identifiers

Run `node scripts/phase161-live-tenant-isolation-probe.js`. The script sends GET requests only and writes `PHASE161_TENANT_ISOLATION_REPORT.json`. It skips without configuration and blocks invalid/cross-origin endpoint configuration.

## Limitations

This is a configurable smoke probe, not a complete security assessment. It requires an endpoint that returns tenant identifiers, and it cannot prove isolation for endpoints or data omitted from that response. A 200 response is not by itself proof of authorization correctness. Run against seeded test tenants and review API access-control policies before production use. Live requests were not run during package generation because no test API/tokens were supplied.
