# Phase 163 — Registry Batch Live Integration Probe

## Purpose
An opt-in integration probe for the existing `POST /api/registry-persistence/batches` route. It submits one uniquely identified record to a disposable test environment, then replays the exact batch and checks that the response identifies the original commit as idempotent.

## Safety gates
The probe sends no requests unless all are configured: `FORESTOS_TEST_API_BASE_URL`, `FORESTOS_TEST_API_TOKEN`, `FORESTOS_TEST_TENANT_ID`, `FORESTOS_TEST_ALLOW_WRITES=YES`, and `FORESTOS_TEST_DATABASE_NAME` containing a standalone `test` marker. HTTPS is required except for localhost. Use a dedicated test tenant and disposable database only. The API must be running and the test token must carry a verified tenant claim matching `FORESTOS_TEST_TENANT_ID`.

Optional: `FORESTOS_TEST_REGISTRY_BATCH_PATH` overrides the default same-origin path `/api/registry-persistence/batches`.

## Run
```bash
node scripts/phase163-registry-batch-integration-contract-tests.js
node scripts/phase163-registry-batch-integration-probe.js
```

The live probe writes `PHASE163_REGISTRY_BATCH_INTEGRATION_REPORT.json`. It intentionally does not print credentials or response bodies.

## Interpretation
Passing the probe provides evidence only for the configured endpoint's initial commit and exact replay response. It does not prove transaction rollback, concurrent-write correctness, comprehensive tenant isolation, schema validation coverage, or production readiness. The live probe was not run during packaging because no dedicated API credentials or test database were provided.
