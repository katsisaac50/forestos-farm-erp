# Phase 178 — Explicit Tenant Context & Audit Writer Remediation

This phase makes the operational audit read path tenant-scoped and introduces an explicit typed writer for tenant-attributed events.

## Changes
- `AuditTenantContext` requires a tenant ID and actor email for `recordForTenant()`.
- The audit schema gains an optional `tenantId` field and `{ tenantId: 1, createdAt: -1 }` index. It remains optional during the compatibility rollout.
- `AuditService.list(tenantId, limit)` fails closed when tenant ID is missing and filters MongoDB reads by that tenant.
- The audit controller obtains tenant ID from authenticated server-side claims (`organizationId` or `tenantId`), not query parameters, and retains the owner-role decorator.
- Existing `record()` call sites remain backward-compatible but create unattributed legacy events. Those events are intentionally absent from tenant-scoped listings until a deterministic, approved reconciliation process attributes them.

## Critical rollout limitation
This is an initial application-code remediation, not a complete migration. Existing writers have not all been converted to `recordForTenant()`. Their events will not appear in tenant-scoped audit listings. Do not silently infer tenant ownership from actor email. Before production release, inventory and convert each call site to use trusted authenticated context, test the global authorization guard and role enforcement, plan the database index rollout, and reconcile historical events from authoritative ownership sources.

## Run
From project root:
```bash
node scripts/phase178-explicit-tenant-audit-context-contract-tests.js
```
Or from `apps/api`:
```bash
npm run test:phase178:contract
```

## Validation boundary
Contract tests are source-level checks. No MongoDB migration, live HTTP authorization test, or NestJS production build is performed by this phase. Production remains NOT CLEARED until runtime tests, call-site conversion, migration rehearsal, and security review pass.
