# ForestOS Phase 99 — Evidence Reliability & Retention Foundations

## Improvements
- Evidence manifest append uses a conditional `findOneAndUpdate` with an atomic array-size guard, reducing the risk of exceeding 10 manifest entries during concurrent uploads.
- Organization-level evidence usage is checked before accepting an upload. Configure `FORESTOS_EVIDENCE_ORG_QUOTA_BYTES`; default is 10 GiB.
- Evidence deletion is now a recoverable soft-delete: metadata records `deletedAt` and `deletedBy`, and the file remains in private storage. Downloads and active usage summaries exclude soft-deleted evidence.
- Delete authorization denial returns HTTP 403.
- Governance summary includes quota and soft-deleted counts.

## Endpoints
- `GET /api/field-capture/governance/summary`
- `DELETE /api/field-capture/:id/evidence/:evidenceId` (soft-delete)
- Existing upload/download endpoints remain available.

## Configuration
- `FORESTOS_EVIDENCE_ROOT`: private storage root.
- `FORESTOS_EVIDENCE_ORG_QUOTA_BYTES`: organization evidence quota in bytes; default 10 GiB. Must be a positive finite number.

## Production caveats
- The quota check is a preflight aggregate and can race across concurrent uploads. It is not a hard transactional quota. For a strict quota, maintain an atomic per-organization usage ledger or use a transactional reservation workflow.
- Soft-deleted files remain on disk and need an approved retention/purge process, legal hold rules, and a recovery procedure. No automatic purge is performed.
- Upload manifest append is atomic with respect to the capture document and per-capture count, but the file write and MongoDB update are not one transaction; cleanup is best-effort.
- Audit write and metadata update are not transactional. A successful soft-delete may occur before an audit persistence error is returned; reconcile via the metadata and audit records.
- `evidenceManifest` remains a flexible array of objects; consider a typed subdocument schema and migration validation.
- The summary byte count relies on metadata and can drift from actual storage. Add storage reconciliation and alerting.
- Evidence remains on a local filesystem; use private object storage or a shared durable volume for multi-instance deployment.
- This phase does not provide malware scanning, EXIF removal, immutable audit storage, automated retention, or verified backup restoration.
- Independent organizations should not be onboarded until all legacy modules have passed tenant-isolation review.

## Verification
The generated ZIP is checked for archive integrity and required files. API compilation, MongoDB integration tests, concurrent request tests, storage failure simulations, and browser tests have not been run.
