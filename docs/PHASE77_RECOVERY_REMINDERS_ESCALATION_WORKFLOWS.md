# Phase 77 — Recovery Reminders & Escalation Workflows

## Delivered
- New escalation event schema with unique deduplication key.
- Owner-protected manual evaluation endpoint: `POST /api/case-evidence/recovery-escalations/run` with optional `daysAhead` (1–30; default 7).
- Owner-protected event history endpoint: `GET /api/case-evidence/recovery-escalations/events?limit=`.
- Evaluates non-closed incidents for critical overdue, overdue, due-soon, unassigned and awaiting-approval conditions.
- Deduplicates repeated events by incident, alert type, recipient and date/overdue bucket.
- Dashboard at `/recovery-escalations` to run an evaluation and review the log.

## Critical limitation
This phase does not send messages. The channel is `internal_log`, delivery status is `logged_only`, and the UI explicitly states that email/SMS/push delivery is not configured. It also does not run automatically on a timer; an owner must run the evaluation manually. This is deliberate so no notifications are falsely claimed as sent.

## Production next steps
- Configure a scheduler (e.g. managed cron or queue worker) with a single-run lock and monitoring.
- Implement a verified email/SMS provider adapter with recipient verification, opt-out/quiet-hour policy, retry/backoff and delivery receipts.
- Separate incident owner, supervisor and approver roles.
- Test duplicate suppression across concurrent runs, timezone edge cases, provider failures and database outages.
