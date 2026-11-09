# Phase 177 — Tenant-Aware Audit Architecture & Migration Planning

Phase 177 adds a read-only source inventory and staged migration plan for tenant attribution in operational and financial audit trails. It does **not** change application schemas, writers, data, or database state.

## Run

From the project root:

```bash
node scripts/phase177-audit-tenant-migration-plan-contract-tests.js
node scripts/phase177-audit-tenant-migration-plan.js
```

Or from `apps/api`:

```bash
npm run test:phase177:contract
npm run plan:phase177:audit-migration
```

The report is written to `PHASE177_AUDIT_TENANT_MIGRATION_PLAN.json`.

## Migration principles

1. Inventory every audit writer and every financial snapshot source before changing signatures.
2. Add schema fields as optional in a compatibility-first release; do not make tenant attribution required prematurely.
3. Pass tenant identity explicitly from validated authenticated context. Never infer it from actor email or client-supplied request data.
4. Backfill only from authoritative, deterministic ownership sources. Ambiguous legacy events remain unresolved and must not appear in a tenant-scoped view until reconciled under an approved policy.
5. Test migration on a representative disposable copy; reconcile counts, unresolved records, duplicate/index risks, and rollback/restore procedures.
6. Enforce tenant-scoped reads only after writers, historical data, and runtime authorization tests are ready.
7. Promote to production only after build, migration verification, runtime isolation tests, and security review pass.

## Scope and limitations

This is a source inspection and planning artifact only. It does not connect to MongoDB, run an API, perform a migration, or prove tenant isolation. The inventory of files containing audit writer calls is not a substitute for reviewing each call and its data lineage. Production remains uncleared.
