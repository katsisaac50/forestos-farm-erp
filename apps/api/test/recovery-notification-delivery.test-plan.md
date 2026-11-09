# Phase 79 test plan

1. With no webhook URL, evaluate incidents: new events should be `logged_only`; delivery endpoint reports no provider.
2. With a local HTTPS/test endpoint configured, evaluate incidents: new events should be `queued`.
3. A provider 2xx response marks event `sent`, increments attemptCount and records deliveredAt.
4. A provider 4xx/5xx, timeout, or network failure marks event `failed`, records a bounded lastError and schedules retry while below max attempts.
5. After max attempts, event is not automatically selected for another delivery.
6. Duplicate dedupeKey events are suppressed by the unique index.
7. Concurrent API workers should not deliver the same queued event simultaneously due to conditional claim update; provider-side idempotency is still required for crash-after-acceptance cases.
8. Non-HTTPS remote URLs are rejected; HTTP localhost is allowed for development tests.
9. Owner-only authorization is enforced on delivery endpoints.
10. Verify scheduler-enabled run evaluates and then processes a bounded batch.
