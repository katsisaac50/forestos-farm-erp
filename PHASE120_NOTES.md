# Phase 120 — Critical Domain Tenant Coverage Queue

## Purpose
Create a repeatable static triage queue for selected high-risk business domains beyond plantations: Sales, Inventory, Procurement, Finance, Workforce, Evidence, and Audit.

## Commands
From `apps/api`:
- `npm run audit:phase120:tenant-coverage` — regenerate `PHASE120_CRITICAL_DOMAIN_TENANT_COVERAGE.json`.
- `npm run test:phase120:contract` — run dependency-free contract checks.

Equivalent direct commands from the project root:
- `node scripts/phase120-critical-domain-tenant-coverage.js`
- `node scripts/phase120-critical-domain-tenant-contract-tests.js`

## How to read the report
The report looks for recognizable controller/service context markers and common unscoped-looking Mongoose query patterns. Priority labels are a review queue only. Static source matching cannot establish runtime behavior, complete data paths, or exploitability. A missing signal is not proof that tenant enforcement is absent; a present signal is not proof of a vulnerability.

The legacy Sales and Inventory controllers/services have no visible tenant-context markers in their current source, and their services include unscoped-looking queries. Procurement and Finance should also be reviewed route by route, including aggregate/dashboard endpoints and related child records. Do not expose these modules to multiple organizations until enforcement is verified or implemented and runtime cross-tenant tests pass.

## Required close-out evidence
1. Trace every route through its actual service and model operations.
2. Verify tenant identity is derived from authenticated active membership, never trusted from an arbitrary request body or query.
3. Verify tenant scope on list, detail, update, delete, aggregation, dashboard, and child-record queries.
4. Run same-tenant positive and cross-tenant negative tests against a dedicated non-production API/database.
5. Record reviewer, test run, and disposition for each route.

## Validation limits
The Phase 120 contract tests are source-level checks only. They do not connect to MongoDB or an API, do not mutate data, and do not certify tenant isolation. No dependency-installed Nest build or live integration tests were run as part of this phase.
