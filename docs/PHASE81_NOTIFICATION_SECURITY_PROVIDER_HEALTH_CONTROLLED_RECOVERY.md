# Phase 81 — Notification Security, Provider Health & Controlled Recovery

## Included
- Read-only provider configuration health and stored delivery metrics at `GET /api/case-evidence/recovery-escalations/provider-health`.
- Controlled replay of one failed event at `POST /api/case-evidence/recovery-escalations/events/:id/replay`.
- Mandatory 10–500 character reason; actor, timestamp, reason and replay count are recorded on the event.
- Replay only transitions a currently failed event to queued; it does not send immediately. A conditional update prevents replaying a status that changed concurrently.
- Owner-only controller authorization is inherited from the existing controller-level `@Roles('owner')`.
- Frontend dashboard at `/recovery-provider-health`.

## Security notes
- Provider health is a configuration/data health check, not a live provider probe. It does not send a test payload.
- HTTPS is expected; HTTP is accepted only for localhost development.
- A replay can still result in a duplicate if a provider accepted a prior attempt but the response was lost. Use provider-side idempotency keyed by `dedupeKey` or `eventId`.
- Replay audit fields are stored on the notification record. For regulated or tamper-resistant audit requirements, export to an append-only external audit store.
- A 2xx response only means provider acceptance, not that an end user received or read the message.

## Environment
`RECOVERY_NOTIFICATION_WEBHOOK_URL`, `RECOVERY_NOTIFICATION_WEBHOOK_TOKEN`, and `RECOVERY_NOTIFICATION_MAX_ATTEMPTS` remain server-side settings. Never expose the token to the browser.

## Validation checklist
1. Build API and frontend.
2. Confirm unauthenticated/non-owner calls are denied.
3. Verify health returns `not_configured` when no endpoint is configured.
4. Verify invalid URL and non-local HTTP produce configuration warnings.
5. Replay a failed event with short reason (must fail), valid reason (must queue), and replay a non-failed event (must fail).
6. Race replay requests and confirm only one succeeds.
7. Confirm replay fields appear in event history and CSV export.
8. Confirm queue processing respects max attempts and provider idempotency.
