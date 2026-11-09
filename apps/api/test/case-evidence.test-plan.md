# Case Evidence — Test Plan
1. Unauthenticated and non-owner requests rejected.
2. Missing/invalid case IDs rejected.
3. Invalid SHA-256 metadata and invalid size rejected at trusted ingestion boundary.
4. Duplicate evidence code rejected by unique index.
5. Review/quarantine require reasons; quarantined evidence cannot be reviewed.
6. Event history records actor, reason, timestamp and hash.
7. Metadata/event write failures are surfaced; separate writes are a known risk.
8. UI handles empty/error states and long hashes.
9. No upload/download endpoint is exposed until secure storage exists.
Tests are planned, not executed during packaging.
