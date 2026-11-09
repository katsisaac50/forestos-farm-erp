# Phase 74 — Evidence Security Hardening & Operational Recovery

## What is included
- Owner-protected storage health endpoint: `GET /api/case-evidence/operations/health`.
- Owner-protected reconciliation endpoint: `POST /api/case-evidence/operations/reconcile` with `{ "apply": false }` for a read-only dry run, or `{ "apply": true }` for quarantine actions.
- Bounded scan of up to 5,000 evidence records per run; response indicates if the scan was truncated.
- Recomputes SHA-256 and file size for active records; identifies missing files and unreferenced disk files.
- Apply mode marks active records with missing/corrupt files as quarantined and appends an event. It never deletes orphan files.
- New `/evidence-storage-operations` page provides dry-run and apply controls plus findings.
- Expanded evidence event schema enum for integrity/recovery event categories.

## Recovery workflow
1. Run a dry run first.
2. Review missing, corrupt and orphan file findings.
3. Preserve the report and investigate storage/DB history.
4. Restore missing/corrupt evidence from a trusted backup, verifying hash and size.
5. Only then use a separately reviewed recovery procedure to restore access.
6. Do not delete orphan files until they are matched against database records and backups.

## API contracts
- `GET /api/case-evidence/operations/health` reports whether the configured directory can be read and how many top-level files/directories it contains. It does not measure disk capacity or backup health.
- `POST /api/case-evidence/operations/reconcile` accepts `apply: boolean`. Missing `apply` defaults to dry-run. The scan is bounded and is not a transactionally consistent snapshot.

## Limitations and deployment warnings
- A reconciliation run reads the directory and database at different times; concurrent uploads or removals may appear as transient findings.
- It checks hashes for active records only. Quarantined records are not silently reactivated.
- No automatic deletion, automatic restoration, immutable backups, malware scanning, encryption-at-rest, alerting, or distributed lock is included.
- Database record updates and event writes remain separate operations; failures can produce incomplete audit trails. Use a durable private volume and verified backups.
- The health endpoint intentionally reports the resolved storage path to owner users only. Avoid exposing this endpoint to non-owner roles.
- Build, browser, security and live database tests have not been run in this environment.

## Validation checklist
See `apps/api/test/evidence-storage-recovery.test-plan.md`.
