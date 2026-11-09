# Phase 82 — Notification Governance & Operational Reliability

## Scope
This phase adds a governance dashboard combining the existing provider-health, delivery-status, audit-summary, and event-history APIs. It provides status and incident-code filters plus a CSV export of the loaded audit rows.

## Route
- Frontend: `/recovery-governance`
- Uses existing owner-protected API routes:
  - `GET /api/case-evidence/recovery-escalations/provider-health`
  - `GET /api/case-evidence/recovery-escalations/delivery-status`
  - `GET /api/case-evidence/recovery-escalations/audit-summary`
  - `GET /api/case-evidence/recovery-escalations/events`

## Important semantics
- `sent` means the webhook endpoint returned a 2xx response; it is not proof of final recipient delivery or reading.
- Export is a snapshot of the currently loaded events (API request limit 500), not a full-database export.
- This phase does not add another notification sender, change retry behavior, or claim provider-side idempotency.
- Provider health is based on configuration and persisted records; it does not send a test notification.

## Manual test plan
1. Sign in as an owner and open `/recovery-governance`.
2. Confirm the page loads provider health, delivery counts, audit summary, and recent events.
3. Filter to `failed`, then search for a known incident code.
4. Export CSV and verify columns, quoted values, and that it only contains the displayed rows.
5. Verify an expired/non-owner session receives an authorization error rather than protected event data.
6. Check empty-state behavior with no matching records and error behavior when the API is unavailable.
7. Verify the dashboard text does not describe HTTP 2xx as confirmed recipient delivery.

## Verification
The ZIP archive can be integrity-checked independently. Application build, database integration, and browser tests must be run in the deployment environment; they are not claimed as passed by this package.
