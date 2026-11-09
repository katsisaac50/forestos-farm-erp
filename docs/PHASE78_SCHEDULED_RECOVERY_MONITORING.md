# ForestOS Phase 78 — Scheduled Recovery Monitoring

## What changed
- Added an opt-in background evaluator inside the NestJS API process.
- Scheduler is disabled unless `RECOVERY_ESCALATION_SCHEDULER_ENABLED=true`.
- `RECOVERY_ESCALATION_INTERVAL_MINUTES` controls the interval (default 15; bounded to 5–1,440 minutes).
- Added MongoDB lease state to reduce overlapping evaluations when multiple API instances run.
- Added `GET /api/case-evidence/recovery-escalations/scheduler-status` (owner role) and the `/recovery-scheduler` status page.
- Tracks last attempt time, success/failure, last error and attempt count.
- Existing dedupe keys continue to suppress repeated log events.

## Configuration
Set in the API process environment and restart the API:

```env
RECOVERY_ESCALATION_SCHEDULER_ENABLED=true
RECOVERY_ESCALATION_INTERVAL_MINUTES=15
```

The worker waits one full interval before its first scheduled run. Keep the manual evaluation endpoint available for operator-initiated checks. Check the status endpoint after deployment.

## Operational and safety limits
- This is an in-process timer, not a dedicated durable queue. If the API is stopped, evaluations pause; missed intervals are not replayed.
- The MongoDB lease reduces concurrent runs but is not a substitute for a dedicated job system. The lease is 120 seconds; very slow evaluations can outlive it.
- Events remain `logged_only` on `internal_log`. No email, SMS, push, webhook or third-party provider is called, and no delivery is claimed.
- Failures are recorded in scheduler state. There is no automatic retry queue or exponential backoff; the next scheduled interval will try again.
- Use monitoring/log collection for process crashes. Protect scheduler status and the manual evaluation endpoint with the existing owner-only authorization.

## Verification checklist
1. Confirm MongoDB is reachable and the API can create the `recovery_scheduler_state` collection.
2. Keep scheduler disabled initially and verify the status page reports `Disabled`.
3. Enable the environment variables in a staging deployment, restart, and verify `Enabled`.
4. Wait at least one configured interval and confirm `lastRunAt`, `lastStatus` and `runCount` update.
5. Run manual evaluation and confirm duplicate suppression remains effective.
6. Test multiple API replicas and a deliberately slow run before production reliance.
7. Do not describe the logs as delivered notifications; configure and verify a provider in a future phase if external delivery is required.

Build, database integration, and browser tests were not run as part of this generated phase package.
