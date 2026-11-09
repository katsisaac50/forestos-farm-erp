# ForestOS Phase 98 — Evidence Governance & Audit Trail

## Added
- Organization-scoped `evidence_access_events` collection for upload, download, and delete audit records.
- Successful upload/download/delete operations write an audit event with actor, organization, capture/evidence IDs, timestamp, outcome, and limited operational details.
- `GET /api/field-capture/governance/summary` reports evidence count, summed recorded bytes, metadata-only evidence count, and up to 100 recent audit events for the selected organization.
- `DELETE /api/field-capture/:id/evidence/:evidenceId` allows organization owners, admins, or managers to delete a stored evidence file and remove its manifest item.
- Upload metadata persistence failure attempts to remove the just-written file.

## Access and data handling
All routes remain behind JWT authentication and resolve `X-Organization-Id` through the organization membership service. Evidence queries use the organization-scoped capture lookup. The governance summary only queries audit events for the active organization. Delete role checks use the active organization context roles.

## Important limitations before production
- This phase does not implement a retention policy, automated expiry, per-organization quota enforcement, immutable/WORM audit storage, malware scanning, EXIF stripping, or backup restore verification.
- Delete is a destructive operation, not a recoverable soft-delete. Audit storage and file deletion are not a single transaction; operators should investigate inconsistent failures.
- Audit records are in the same MongoDB deployment and are not tamper-proof against privileged database administrators.
- The summary's byte total is derived from evidence metadata and can drift if files are removed outside ForestOS.
- `recentEvents` returns actor IDs and operational metadata to any authenticated organization member; consider restricting this endpoint to managers and minimizing details before production.
- Upload concurrency can still race the 10-file cap and manifest updates. Use atomic/transactional updates or object-storage workflows for high concurrency.
- Local filesystem storage is not suitable for multi-instance deployments without a shared private persistent volume. Object storage with private access and lifecycle controls is recommended.
- The current controller uses `BadRequestException` for a delete-role denial; production should use a dedicated `ForbiddenException`.
- Legacy modules have not all been audited for tenant isolation. Do not onboard unrelated organizations until a full isolation review is complete.

## Verification
ZIP integrity and expected-file presence are checked when the archive is generated. API build, database integration tests, filesystem permission tests, concurrent upload/delete tests, and browser tests have not been run.
