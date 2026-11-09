# Phase 76 — Automated Recovery Monitoring & Management Alerts

## Delivered
- Owner-protected endpoint `GET /api/case-evidence/recovery-alerts?daysAhead=7`.
- Live classifications for overdue incidents, due-soon incidents (1–30 day window), critical/high incidents, incidents awaiting approval, and unassigned incidents.
- Summary counts and bounded scan metadata (up to 1,000 open incidents).
- Dashboard at `/recovery-alerts` with selectable due-soon window and manual refresh.
- Links to recovery governance, evidence storage recovery and evidence register.

## Alert rules
- Overdue: non-closed incident has a due date earlier than the time of the query.
- Due soon: non-closed incident has a due date between query time and the selected cutoff.
- Critical/high: any non-closed critical or high severity incident.
- Awaiting approval: non-closed incident status is `awaiting_approval`.
- Unassigned: non-closed incident has no non-empty `assignedTo`.

## Important scope
This phase computes alerts when the endpoint is requested; it does not run a background scheduler. No email, SMS, push notification, or automatic reminder has been sent or configured. Results reflect the records available during the query and are not a transactionally consistent snapshot. The scan is capped at 1,000 non-closed incidents; `scanTruncated` warns when the cap is reached.

## Verification status
Archive integrity and required file presence are checked. Production build, browser testing, security testing, and live MongoDB integration tests have not been run.
