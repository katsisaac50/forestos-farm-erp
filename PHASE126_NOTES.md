# Phase 126 — Inventory Control Tenant Ownership & Migration Design

## Purpose
Review the legacy Inventory Control module before any tenant migration. This phase is intentionally a **read-only static audit and migration design**, not a code migration or database operation.

## Static findings
The source currently shows:
- `StockItem` declares `itemCode` as globally unique and does not visibly declare `organizationId`.
- `StockMovement` has an `itemId` reference but does not visibly declare `organizationId`.
- Inventory dashboard/list queries can read all stock items and movements.
- Movement posting looks up its parent stock item by ID without a visible organization predicate.
- The controller is role-gated (`owner`) but no organization-context integration is visible in this module's controller/service.

These are high-priority review findings from source inspection, not proof of runtime exploitation. Whether this inventory is intentionally global or should be tenant-owned is a product and data-governance decision.

## Safe migration design
1. **Choose the ownership model.** Record whether inventory is global/shared or belongs to an organization. Do not infer ownership from the current logged-in user, a stock code, or a display name.
2. **Inventory legacy records.** Count records, inspect duplicates, identify orphaned movements, and capture existing indexes from a backed-up non-production database.
3. **Build an explicit mapping.** Every legacy stock item must map to a verified organization or be placed in a quarantine/review queue. Do not automatically assign an organization.
4. **Resolve movement ownership from the parent.** Verify each movement's `itemId` resolves to exactly one stock item. Orphans and ambiguous parents must be quarantined; do not guess.
5. **Choose uniqueness constraints.** If tenant-owned, evaluate `{ organizationId, itemCode }` uniqueness and movement-code uniqueness under the selected scope. Check duplicates before creating indexes. If global, document why and enforce that policy consistently.
6. **Implement request context and scoped queries.** Derive organization identity from authenticated, authorized context, never from an untrusted body field. Scope reads, writes, updates, counts, dashboard totals, and parent lookups.
7. **Test boundaries.** Add tests for two organizations with colliding codes, cross-organization item IDs, orphan movements, list/dashboard leakage, and attempts to spoof organization IDs.
8. **Dry run and approval.** Produce a before/after count and exception report, take a verified restorable backup, obtain owner approval, apply in a maintenance window, and verify post-migration invariants. Prepare rollback before execution.

## Not performed
- No MongoDB connection, live data scan, index inventory, backfill, or record mutation.
- No NestJS build or HTTP integration test.
- The contract tests validate static report behavior only.
