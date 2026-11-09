# Phase 83 — Notification Policy Management & Scalability Foundation

## Delivered
- Owner-only API for creating, listing, updating, and reviewing notification policies.
- Policy fields include severity, enabled state, due-soon window, overdue repetition interval, approval-waiting threshold, recipients, and channels.
- Required human-readable change reason for create/update.
- Optimistic concurrency via `recordVersion` and `expectedVersion`.
- Policy-change history stores actor, action, reason, before/after snapshots, and versions.
- Frontend management page at `/notification-policies`.
- Validation bounds policy values and restricts accepted channels.

## API
- `GET /api/notification-policies`
- `POST /api/notification-policies`
- `PATCH /api/notification-policies/:policyKey`
- `GET /api/notification-policies/:policyKey/history?limit=100`

Create requires `policyKey`, `name`, `description`, `severity`, and `reason` (10–1000 characters). Update requires `expectedVersion` and `reason` (10–1000 characters). The caller must have the `owner` role.

## Critical behavior boundary
This phase stores and audits policies but **does not yet apply them to the scheduled escalation evaluator**. This avoids silently changing production notification behavior before policy evaluation semantics and migration defaults are tested. The page explicitly communicates this.

## Scaling architecture roadmap
The current product remains a single-organization starter architecture. The next production-scale milestones should be:
1. **Tenant isolation:** derive organization/tenant IDs only from trusted JWT claims; scope every model query and compound unique index. Never trust a caller-supplied tenant ID.
2. **Domain boundaries:** separate farm operations, finance, evidence, notifications, and reporting behind stable service contracts.
3. **Reliable jobs:** move scheduled evaluation and webhook delivery to a durable queue/outbox with leases, idempotency keys, bounded retries, dead-letter handling, and observable worker health.
4. **Data and storage:** use managed MongoDB replica sets, indexes based on actual query plans, private object storage, encryption, backups, restore drills, and retention policies.
5. **Security:** enforce least-privilege roles, tenant-aware authorization, secret management, rate limiting, request validation, audit retention, and security monitoring.
6. **Operations:** structured logs, metrics, tracing, readiness/liveness probes, CI build/test gates, migrations, and staged deployment.
7. **Offline field work:** explicit sync queues, conflict resolution, idempotent writes, and device-aware data ownership before scaling to multiple field teams.
8. **Performance:** pagination and cursor-based APIs instead of unbounded list calls; report aggregation limits and explain-plan reviews.
9. **Testing:** unit, API, concurrency, tenant-boundary, migration, restore, and browser end-to-end tests in CI.

## Manual verification checklist
- Owner-only authentication is enforced for all routes.
- Duplicate policy keys return conflict instead of creating duplicate records.
- Invalid severity, channels, recipients, thresholds, and missing reasons are rejected.
- Stale `expectedVersion` returns a conflict and does not overwrite newer data.
- Each successful create/update produces a history event.
- Policy history is sorted newest first and limited to 1–500 records.
- Verify policy data is not accidentally presented as already active notification behavior.
- Build API and frontend, then run MongoDB and browser integration tests before deployment.

## Verification status
The generated ZIP was integrity-checked and required Phase 83 files were confirmed present. API/frontend builds, live database tests, and browser tests have not been run.
