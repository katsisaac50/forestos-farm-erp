# Phase 179 — Audit Writer Conversion & Tenant Attribution Coverage

## Implemented
- Converted plantation create/update audit events to `AuditService.recordForTenant()`.
- Tenant ID comes from `requireOrganizationContext(rawContext)` and `context.organizationId`; actor identity remains the caller-supplied authenticated actor email already used by this service.
- Preserved the existing organization metadata and changed-field metadata.
- Added a static writer-coverage inventory and contract tests.

## Run
From the project root:

```bash
node scripts/phase179-audit-writer-conversion-contract-tests.js
node scripts/phase179-audit-writer-coverage-audit.js
```

Or from `apps/api`:

```bash
npm run test:phase179:contract
npm run audit:phase179:audit-writers
```

## Security and rollout limitations
- This is a partial conversion, not a complete writer migration. The coverage report lists remaining legacy call sites for review.
- The audit actor email is passed from the existing service call path; verify its origin at each controller before treating it as trusted.
- Tenant-aware events are written only when an explicit validated tenant context is available. Do not infer tenant ID from email or free-form metadata.
- Historical records are not migrated by this phase.
- No database connection, live test, or production build was run in this phase.
- Production status remains `NOT CLEARED FOR PRODUCTION` until all writer paths, authorization, migration, and runtime behavior are verified.
