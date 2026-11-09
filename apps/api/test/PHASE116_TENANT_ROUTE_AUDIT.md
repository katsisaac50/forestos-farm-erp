# Phase 116 — Domain Route Tenant Enforcement Audit

## Purpose
This phase adds a static inventory of decorated API controller routes and flags controllers that do not reference `OrganizationAccessService` / `resolveContext`. It helps prioritize the next security work: domain-route tenant enforcement and tests.

## Run
From the project root:

```bash
node scripts/phase116-tenant-route-audit.js
node scripts/phase116-tenant-route-audit-contract-tests.js
```

The audit writes `PHASE116_TENANT_ROUTE_AUDIT.json`. Override the output path with `FORESTOS_PHASE116_AUDIT_OUT=/path/to/report.json`.

## Initial inventory
- Controllers with decorated routes: 59
- Controllers referencing organization context: 9
- Controllers with no organization-context reference found: 50
- Decorated routes inventoried: 222

## Interpretation
These counts are **static signals, not a definitive vulnerability count**. A controller might enforce tenant boundaries in a service, a guard, or a shared helper without directly referencing the organization context. Conversely, a controller that references the context service may still have unscoped routes or services. Review each route and its complete service/query path before deciding whether it is safe.

The current API includes legacy modules whose controllers do not visibly resolve organization context. This phase deliberately reports and prioritizes that fact rather than making broad automatic changes that could break workflows or falsely imply security. No live API or database tests were run.
