# Phase 99 Test Plan

- [ ] Concurrent uploads to the same capture never create more than 10 manifest entries.
- [ ] Upload rejected with HTTP 409 when organization quota preflight would be exceeded.
- [ ] Concurrent uploads across different captures are tested for quota oversubscription; strict quota ledger remains required before production.
- [ ] File is removed best-effort if atomic manifest update fails.
- [ ] Soft-delete returns recoverable status, records deletedAt/deletedBy, and leaves the file for retention/recovery.
- [ ] Download of soft-deleted evidence returns not found.
- [ ] Active summary excludes soft-deleted evidence from count and byte total and reports softDeletedCount.
- [ ] Unauthorized delete returns HTTP 403.
- [ ] Tenant isolation is verified for upload, download, delete, summary, and audit records.
- [ ] Audit persistence failures and metadata/audit inconsistencies are simulated.
- [ ] Recovery procedure restores access to soft-deleted evidence only for authorized roles and writes a recovery audit event (not implemented in this phase).
- [ ] Backup restore verifies both MongoDB metadata and evidence files.
