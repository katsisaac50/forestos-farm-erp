# Phase 84 — Policy-Driven Escalation Engine (Preview)

Adds an owner-only, read-only policy evaluation preview for open recovery incidents.

## API
`POST /api/notification-policies/evaluate`

The endpoint returns evaluation time, enabled-policy count, scanned-incident count, scan truncation flag, and matches. It does not enqueue or send notifications.

## Matching
- Only enabled policies are considered.
- Severity must match the incident severity.
- Awaiting-approval incidents match after `approvalWaitingHours` since last update/creation.
- Overdue incidents match according to `overdueRepeatHours`.
- Due-soon incidents match within `dueSoonDays`.
- Unassigned critical/high incidents can match if no due-date rule takes precedence.
- At most one policy matches each incident; candidates are ordered by severity/key.
- Scans are capped at 2,000 incidents.

## Safety boundary
This is a preview, not a live notification workflow. The existing delivery event schema and deduplication behavior must be integrated through a separately tested idempotent outbox before any automatic sending is enabled.

## Scaling work still required
Tenant-aware policy and incident scoping; explicit priority for multiple policies; pagination or durable jobs for larger datasets; provider idempotency; boundary/concurrency tests; recipient validation; monitoring.
