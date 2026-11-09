# ForestOS Phase 103 — Continuous Security Regression Checks

## What changed
- Added `scripts/phase103-security-regression.js` to orchestrate the existing tenant-isolation source smoke checker and API route inventory generator.
- The orchestrator validates that the inventory has a non-empty controller set, a non-empty route list, and a matching summary count.
- Updated `.github/workflows/release-readiness.yml` so the source-contract CI job runs the Phase 103 security regression checks on pushes, pull requests, and manual workflow dispatch.

## Run locally
```bash
node scripts/phase103-security-regression.js
```

## What a passing result means
The selected source patterns were found, the route inventory could be generated, and its summary count matches its route list. It is a useful regression tripwire, not proof of secure behavior.

## What it does not prove
- It does not execute API routes or access MongoDB.
- It does not prove every controller has correct authentication, role checks, or tenant-scoped database operations.
- It does not replace API/web builds or integration tests.
- It does not make the route-inventory heuristic flags confirmed vulnerabilities.
- Existing CI build jobs may still fail; this phase has not run those jobs in a clean CI environment.

## Next release gates
1. Add a disposable MongoDB test service and integration test framework.
2. Build two-organization tests for read/write/delete/aggregation/export routes.
3. Enforce a manual review of every route inventory signal.
4. Fix confirmed findings and preserve regression tests.
5. Run API and web builds in CI and capture results before release.
