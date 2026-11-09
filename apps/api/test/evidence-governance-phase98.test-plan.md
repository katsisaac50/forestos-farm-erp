# Phase 98 Evidence Governance — Test Plan

- [ ] Authenticated organization member can upload a valid JPEG/PNG/WebP/PDF; an `uploaded/success` audit event is written.
- [ ] Unsupported signatures and MIME mismatches are rejected.
- [ ] Download is limited to the active organization and produces a `downloaded/success` event.
- [ ] A user from another organization cannot download or delete the evidence by guessing capture/evidence IDs.
- [ ] Owner/admin/manager can delete evidence; a worker/member receives a forbidden response (change current 400 to 403 before production).
- [ ] Successful deletion removes file and manifest item and writes a `deleted` event.
- [ ] Missing file, missing manifest item, malformed IDs, path traversal attempts, and tampered digest fail closed.
- [ ] Governance summary only includes the active organization's records and reports metadata-only items distinctly.
- [ ] Audit database outage behavior is explicitly tested; operation/audit consistency should be improved before production.
- [ ] Concurrent uploads cannot exceed per-capture limit after atomic update work is added.
- [ ] Restore test verifies evidence files and MongoDB metadata are recovered consistently.
