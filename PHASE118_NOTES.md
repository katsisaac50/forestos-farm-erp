# ForestOS Phase 118 — Route-to-Service Tenant Remediation Matrix

## Purpose
Turn Phase 116's controller route inventory and Phase 117's service query triage into one prioritized manual-remediation queue. This phase does not automatically change application authorization or database query behavior.

## Run
From the repository root:

```bash
node scripts/phase116-tenant-route-audit.js
node scripts/phase117-service-tenant-query-audit.js
node scripts/phase118-route-service-remediation-matrix.js
node scripts/phase118-route-service-contract-tests.js
```

The generated matrix is `PHASE118_ROUTE_SERVICE_REMEDIATION_MATRIX.json`. API package scripts are available as `npm run audit:phase118:remediation-matrix` and `npm run test:phase118:contract`.

## How to use the matrix
1. Start with `P1_ROUTE_AND_SERVICE_REVIEW` and `P1_ROUTE_REVIEW`.
2. Confirm the actual controller → service → model/repository call path in source; same-directory candidates are only hints.
3. Review each tenant-owned read, update, delete, aggregation, export, and background operation.
4. Verify tenant scope is enforced in the database predicate or a shared enforcement layer that is itself tested.
5. Derive organization context from authenticated active membership; never trust a request-supplied organization ID alone.
6. Add same-tenant success tests and cross-tenant denial tests, including suspended/inactive membership.
7. Record the reviewer, evidence, test result, and disposition before closing an item.

## Limitations
This is a static heuristic join of two static reports. It does not parse TypeScript or establish runtime call graphs. A controller can use a service property without calling it for every route; a same-folder service may be unrelated. Static flags are not confirmed vulnerabilities, and a low-priority row is not proof of safety. No API/database integration tests or full builds are claimed.

## Production gate
Do not claim production readiness until dependency-installed API and web builds, database-backed tests, route-by-route tenant authorization tests, deployment/security configuration review, and independent evidence-based sign-off are complete.
