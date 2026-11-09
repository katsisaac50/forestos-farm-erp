# Phase 162 — Live API Readiness Smoke Test

## Purpose
Adds an opt-in, read-only HTTP smoke test to establish whether a configured ForestOS API health route and optional protected read route respond successfully.

## Run
- Contract checks: `node scripts/phase162-live-api-smoke-contract-tests.js`
- Optional live smoke test: `node scripts/phase162-live-api-smoke.js`

Configuration:
- `FORESTOS_TEST_API_BASE_URL` (required for live requests; HTTPS except localhost)
- `FORESTOS_TEST_HEALTH_PATH` (optional; defaults to `/api/health`)
- `FORESTOS_TEST_READ_PATH` (optional protected GET endpoint)
- `FORESTOS_TEST_API_TOKEN` (dedicated non-production token for protected read route)

The runner restricts requests to the configured origin, uses timeouts, does not follow redirects, never logs the token or response body, and writes `PHASE162_LIVE_API_SMOKE_REPORT.json`.

## Validation and limitations
Contract tests are static checks of the runner's safety and reporting logic. A live test is only counted when the user configures a test API. HTTP status alone does not verify business logic, tenant isolation, authorization completeness, database transactions, or durability. No production-readiness claim is made.
