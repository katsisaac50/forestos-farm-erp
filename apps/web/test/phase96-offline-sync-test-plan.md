# Phase 96 offline sync test plan

1. Load field-work while online, queue a checklist change, and verify it persists after reload.
2. Disconnect, queue changes, reconnect with page open, and verify automatic sync is attempted.
3. Verify manual sync is disabled offline and enabled when online with queued drafts.
4. Simulate 401/403/500 responses; confirm failed drafts remain queued and later drafts still attempt sync.
5. Confirm field-capture queue requires token and organization context and sends X-Organization-Id.
6. Confirm stable clientSubmissionId is retained across retries.
7. Verify queue state after browser reload and storage quota failures.
8. Test duplicate and concurrent capture submissions against MongoDB unique index behavior.
9. Test organization switching; queued records must not be submitted to a different organization accidentally.
10. Verify no GPS data is added without explicit consent.
11. Test conflict handling when the server version changes while a local checklist snapshot is queued.
12. Run TypeScript and Next.js production builds before release.
