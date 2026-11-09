# Phase 107 — Automated Tenant Security Pipeline

## What this adds
A dedicated GitHub Actions workflow at `.github/workflows/tenant-security-regression.yml`.

On pull requests and pushes to `main` or `master`, it:
1. Uses Node.js 20.
2. Syntax-checks the Phase 106 HTTP test harness.
3. Runs Phase 105 executable source-contract tests.
4. Runs Phase 104 membership regression checks.
5. Runs Phase 103 security regression checks and refreshes the API route inventory.
6. Uploads route-inventory audit artifacts.

## Optional live HTTP job
The live HTTP job is disabled unless the repository variable `FORESTOS_LIVE_TENANT_TESTS_ENABLED` is exactly `true`. If enabled, configure:
- Repository variable `FORESTOS_TEST_API_BASE_URL`
- Repository variables `FORESTOS_TENANT_A_ORG_ID`, `FORESTOS_TENANT_B_ORG_ID`
- Repository secrets `FORESTOS_TENANT_A_TOKEN`, `FORESTOS_TENANT_B_TOKEN`, `FORESTOS_SUSPENDED_TOKEN`

Important: the example scenario JSON still contains placeholder routes and record IDs. Replace it with a tested scenario file and ensure the API URL targets a dedicated non-production environment before enabling the job. The current generic runner blocks remote targets unless `FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true` is set, so the optional remote job will intentionally fail closed until that variable is explicitly configured in a safe workflow environment. Do not set it for production.

## Honest status
The workflow YAML and source scripts can be checked locally, but the GitHub Actions workflow itself has not been run from this environment. Live HTTP requests are not automatically performed by the default job.

## Workflow contract smoke test
Run `node scripts/phase107-workflow-contract-tests.js` to verify that the workflow retains its intended triggers, regression commands, opt-in gate, and audit artifact upload. This is a source-level check, not a run of GitHub Actions itself.
