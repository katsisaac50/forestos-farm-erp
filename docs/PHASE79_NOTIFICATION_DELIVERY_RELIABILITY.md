# Phase 79 — Notification Delivery & Reliability

## Added
- Delivery status dashboard at `/recovery-delivery`.
- Delivery status API: `GET /api/case-evidence/recovery-escalations/delivery-status`.
- Manual delivery: `POST /api/case-evidence/recovery-escalations/deliver` with optional `{ "limit": 25 }`.
- Retry eligible failures: `POST /api/case-evidence/recovery-escalations/retry-failed`.
- Webhook adapter uses Node's built-in `fetch`; no additional package is required.
- Delivery attempt counter, last error, next retry time, provider name and delivered timestamp are stored on events.
- Bounded exponential retry delay and configured maximum attempts.
- Automatic scheduled processing attempts queued notifications after scheduled evaluation when the Phase 78 scheduler is enabled.

## Configuration
Set in the API environment:

```env
RECOVERY_NOTIFICATION_WEBHOOK_URL=https://your-authorized-notification-provider.example/api/notify
RECOVERY_NOTIFICATION_WEBHOOK_TOKEN=replace-with-secret-token
RECOVERY_NOTIFICATION_MAX_ATTEMPTS=5
```

The webhook receives a JSON object with `eventId`, `dedupeKey`, incident details, `recipient`, `message`, and `attempt`. The receiving service must validate the Bearer token, enforce idempotency using `dedupeKey`, and safely route the message. Use HTTPS; HTTP is accepted only for localhost testing. Do not point this at an arbitrary or untrusted URL.

## Delivery semantics and limitations
- `sent` means the configured endpoint returned a 2xx response; it does not prove that a person received or read an email.
- This is a generic webhook adapter, not a built-in SMTP implementation. A real email provider or trusted integration service must be configured.
- The worker can crash after provider acceptance but before MongoDB records `sent`; providers should support idempotency using `dedupeKey` to avoid duplicates.
- Retries are bounded. Events at the maximum attempt count remain `failed` and require operator review; no unbounded retry occurs.
- Existing `logged_only` records are not silently converted into messages. Only new evaluations created while a webhook is configured enter the delivery queue.
- API owner role protects delivery operations. Do not expose provider credentials in frontend code.

## Verification
Static ZIP integrity check only. Application build, MongoDB integration, provider contract and browser tests have not been run in this environment.
