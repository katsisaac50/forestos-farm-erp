# Phase 80 — Notification Operations & Audit Governance

## Scope
- Filter notification events by delivery status, incident code, and creation date range.
- Provide aggregate delivery counts, provider breakdown, 24-hour activity, and a clearly qualified acceptance-rate metric.
- Export the currently displayed (maximum 500) filtered records to CSV from `/recovery-delivery`.
- Keep webhook secrets server-side and out of the audit UI.

## API
- `GET /api/case-evidence/recovery-escalations/events?limit=100&status=failed&incidentCode=INC-001&from=2026-10-01T00:00:00.000Z&to=2026-10-21T23:59:59.000Z`
- `GET /api/case-evidence/recovery-escalations/audit-summary`

Allowed status values: `queued`, `suppressed`, `failed`, `sent`, `logged_only`. Invalid status values are ignored rather than used as database filters. Event query is capped at 500 records. Incident-code search is escaped before being used as a case-insensitive regular expression.

## Metric interpretation
`deliverySuccessRate` = provider-accepted (`sent`) events divided by accepted plus failed events. This metric is not an end-user delivery/read receipt and can change as queued items are processed. Provider breakdown and counts are operational summaries, not an immutable compliance ledger.

## Security and limitations
- Existing owner-only controller authorization applies to these endpoints.
- Date filters that do not parse as valid dates are ignored; callers should send ISO-8601 dates.
- CSV export is a client-side snapshot of records currently displayed (maximum 500), not a full database export.
- This phase does not add manual replay, provider-side idempotency, external immutable audit storage, alert delivery for provider outages, or a dedicated provider health probe.
- MongoDB aggregate/query performance should be reviewed against production data volume; add supporting indexes and pagination before very large deployments.

## Test plan
1. Request the audit summary with no events; confirm all status counters are zero and rate is `null`.
2. Insert mixed statuses and confirm counts, provider breakdown, and 24-hour count.
3. Filter by each allowed status and confirm only matching rows are returned.
4. Search incident code with regex metacharacters (e.g. `INC.[1]`) and verify they are treated literally.
5. Apply valid from/to dates and verify boundary filtering.
6. Confirm limit is clamped to 1–500.
7. Confirm unauthenticated/non-owner requests are rejected by the existing global auth guard.
8. In browser, filter records and export CSV; verify commas, quotes, and line breaks are escaped correctly.
9. Verify secrets/tokens never appear in event rows, summary responses, or CSV.
10. Run API and frontend builds, then perform MongoDB and browser integration tests before production deployment.
