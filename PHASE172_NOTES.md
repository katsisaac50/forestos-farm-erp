# Phase 172 — Tenant-Scoped Data Access Verification

## Purpose
Add a read-only source inventory that flags database-operation contexts needing tenant-scope review. It scans service/controller TypeScript files and common Mongoose-style query operations, records nearby tenant/organization signals, and emits `PHASE172_TENANT_DATA_ACCESS_REPORT.json`.

## Run
From the repository root:
```bash
node scripts/phase172-tenant-data-access-contract-tests.js
node scripts/phase172-tenant-data-access-audit.js
```
Or from `apps/api`:
```bash
npm run test:phase172:contract
npm run audit:phase172:tenant-data-access
```

## Safety and limitations
This audit is read-only and does not connect to a database. Results are heuristic review leads, not proof of a vulnerability or proof of safety. Query helpers, guards, middleware, and dataflow may not be visible in the local source context. A visible tenant token is not proof of a correctly constrained query. Do not declare production readiness until full code review and live cross-tenant read/write tests pass in a disposable test environment.
