# Phase 167 — Recovery, Idempotency & Release Readiness

## Purpose
Phase 167 extends the opt-in transaction fault-injection test into a recovery sequence. It first forces a storage-level rejection and checks that the transaction leaves no records, batch commit, or revision. It then submits a separate valid batch at revision 0, verifies the two records commit at revision 1, replays the exact batch, and checks that the retry preserves the original commit ID/revision without duplicate records or ledger entries.

## Run
From `apps/api`:
- `npm run test:phase167:contract` — source-level safety and behaviour checks.
- `npm run test:phase167:live` — opt-in live MongoDB integration test.

Live execution requires installed API dependencies, a built API (`npm run build`), a disposable MongoDB replica set, `FORESTOS_TEST_MONGODB_URI`, `FORESTOS_TEST_DATABASE_NAME` matching the URI database exactly and containing a standalone `test` marker, and `FORESTOS_TEST_ALLOW_WRITES=YES`. The script uses uniquely named collections and drops only those collections it creates. Never point it at production or valuable data.

## Evidence and limitations
Contract tests inspect source and test assertions; they are not proof of live database behaviour. If the live test is skipped, fails to connect, or the API build has not run, do not treat the runtime transaction/recovery behaviour as verified. Review MongoDB logs and test output before any release decision.
