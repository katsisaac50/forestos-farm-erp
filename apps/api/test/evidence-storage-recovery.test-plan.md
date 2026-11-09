# Phase 74 operational recovery test plan

1. Owner can run dry-run; non-owner/unauthenticated requests are rejected.
2. Dry-run never mutates evidence status or deletes files.
3. Correct active file reports no mismatch.
4. Tampered active file is reported with expected/actual hash and size.
5. Missing active file is reported.
6. A file in storage with no database record is reported as orphan.
7. Apply mode marks missing/corrupt active records quarantined and appends an event.
8. Apply mode never deletes orphan files.
9. Quarantined records are not automatically reactivated.
10. More than 5,000 records returns scanTruncated=true.
11. Concurrent upload during reconciliation is documented as a possible transient finding.
12. Storage permission/directory failures are surfaced by health endpoint.
13. Confirm the storage directory is private and not served by the web app.
14. Test recovery from backup and verify bytes against trusted hash before restoring.
