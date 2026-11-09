# ForestOS Phase 27 — Automated Alerts, Escalation & Management Notifications

## Delivered
- Owner-only alert center at `/alert-center`.
- API: `GET /api/alert-center/dashboard`, `POST /api/alert-center/refresh`, and `PATCH /api/alert-center/:id/state`.
- Refresh-time rule evaluation for low stock, overdue labour tasks, failed workflows, workflows pending more than 24 hours, stale/expired active KPI targets, and high-scoring or overdue risks.
- Persisted alert states: open, acknowledged, resolved.
- A resolution note is mandatory when resolving an alert. The owner can reopen an alert.
- Alert keys are based on the source record ID so repeated refreshes update the same alert rather than creating a new alert for the same record.
- Resolved alerts reopen if their underlying condition is still present during a later refresh.

## Limits and cautions
- This is refresh-driven evaluation, not a scheduled/background process and not email, SMS, push, or WhatsApp delivery.
- Only the most recent/bounded records are scanned in several source modules. Large farms should add indexed, paginated queries and explicit monitoring for scan limits.
- Low stock compares recorded on-hand quantity to reorder level; verify physical stock before acting.
- Overdue tasks use planned date and status; task records may be stale.
- Workflow pending age uses the source record's `createdAt`; retrying workflows can have stock/accounting consequences and must be reviewed.
- KPI staleness is a prompt to review, not proof of poor performance. Expired KPI targets with no updates are flagged for owner review.
- Risk alerts calculate a simple score using residual likelihood/impact when present, otherwise inherent likelihood/impact. It is a triage heuristic, not a professional risk assessment.
- Alert actions update the alert register only. They do not correct source records or notify external recipients.
- No compile/build, live API, database, auth/role, or browser test was run while creating this archive. Test in a disposable development environment before operational use.

## Suggested verification
1. Confirm owner-only access for all three API routes.
2. Seed source records for each alert type and test refresh.
3. Refresh twice and confirm duplicate alert records are not created.
4. Confirm acknowledging and resolving updates the same alert.
5. Confirm resolution requires a note and resolved alerts reopen when a trigger remains.
6. Validate date, severity and workflow-age assumptions with test fixtures.
