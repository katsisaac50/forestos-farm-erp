# ForestOS Phase 117 — Service-Level Tenant Query Review Queue

## Purpose
Build on Phase 116's controller inventory by creating a prioritized manual-review queue for API `*.service.ts` files. This is a security engineering aid, not a claim that the application is production-ready.

## Run
From repository root:

```bash
node scripts/phase117-service-tenant-query-audit.js
node scripts/phase117-service-tenant-query-contract-tests.js
```

The report is written to `PHASE117_SERVICE_TENANT_QUERY_AUDIT.json`. API package scripts are also available: `npm run audit:phase117:tenant-queries` and `npm run test:phase117:contract` from `apps/api`.

## Priority meaning
- **P1_REVIEW**: query-like call markers without visible organization field mentions; investigate first, especially writes.
- **P2_REVIEW**: query markers exist but no visible organization-context signal was detected.
- **P3_CONFIRM**: static signals exist, but each query still needs manual verification.

These labels are triage priorities, not vulnerability findings. The scanner uses regular expressions; it does not understand TypeScript syntax or data flow, and may miss repositories, helper methods, guards, aggregation pipelines, aliases, or alternative scoping patterns. Mentions can also be unrelated to the actual query.

## Required next steps before production claims
1. Trace route → controller → service → model/repository for every sensitive endpoint.
2. Review reads and writes, including direct `_id` lookup/update/delete, aggregation pipelines, exports, and background jobs.
3. Confirm organization scope is derived from authenticated, active membership context.
4. Add route-level cross-tenant positive/negative integration tests using a dedicated non-production environment.
5. Run dependency-installed API and web builds, database-backed tests, and the CI workflow; record actual results and review sign-off.

## Validation boundary
Phase 117 contract tests are dependency-free static checks. They do not run the NestJS app, connect to MongoDB, exercise endpoints, or prove tenant isolation. No live API/database test is claimed by this phase.

**Security certification status:** This phase is not a security certification.
