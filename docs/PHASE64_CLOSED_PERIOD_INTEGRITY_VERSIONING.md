# Phase 64 — Closed-Period Integrity & Financial Record Versioning

## Implemented
- Added an append-only monthly-close version event collection.
- Captures a snapshot for draft saves, closure, reopening, and detected post-close source changes.
- Adds close version numbers and a SHA-256 fingerprint of bounded reconciliation, escalation and capital-spend source records.
- Dashboard recomputes a current source fingerprint; if it differs from the fingerprint captured at closure, it flags `sourceChangedAfterClose`, records a version event, and writes an audit event.
- Added read-only version history endpoint: `GET /api/monthly-financial-close/versions/:month`.

## Important boundaries
- Fingerprinting covers only the source queries currently loaded (up to 300 reconciliation records, 300 open escalations and 1,000 verified/pending spend records). It is not a whole-database proof if the limits are reached.
- The fingerprint is a change detector, not a cryptographic signature proving the source records were truthful at the time.
- Detection runs when the dashboard is read; this is not a background watcher.
- A changed source record flags the close for re-review; it does not automatically reopen the month or mutate the original close status.
- The append-only history is enforced by application workflow only; a database administrator can still edit/delete records unless database-level permissions and backups protect them.
- Existing operational and financial modules are not all made immutable by this phase. The system detects changes to selected source records only.
- The event record and audit event are separate writes; transaction support and repair handling remain a production requirement.

## Release test plan
1. Save multiple drafts and verify version increments and snapshots.
2. Close a period and verify closure snapshot and fingerprint are saved.
3. Change a reconciliation or spend source record; refresh dashboard; verify sourceChangedAfterClose becomes true and an event is added.
4. Confirm unchanged source data does not flag a closed period.
5. Reopen a flagged period with a reason; verify version history records it.
6. Test large periods where a query reaches a limit; verify warning and avoid treating the fingerprint as complete.
7. Verify version-history endpoint is owner-only and rejects invalid month format.
8. Simulate failure between close save, version event and audit event; ensure operational reconciliation procedure detects gaps.

## Verification status
ZIP integrity and required-file presence only. No application build, runtime, MongoDB integration, or security test has been run.