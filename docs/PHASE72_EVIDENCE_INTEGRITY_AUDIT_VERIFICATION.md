# Phase 72 — Evidence Integrity & Audit Verification

## Added
- Owner-protected API module for evidence metadata and history.
- Evidence metadata includes case linkage, file names, MIME type, byte size, SHA-256, uploader and status.
- Events record review and quarantine actions with actor, reason, hash and timestamps.
- Routes: `GET /api/case-evidence?caseId=...`, `GET /api/case-evidence/:id/history`, `POST /api/case-evidence/:id/review`, `POST /api/case-evidence/:id/quarantine`.
- Web route `/case-evidence` lists metadata and event history and supports review/quarantine.

## Important security limitation
This phase does not implement actual file upload/download, private object storage, malware scanning, MIME sniffing, or hash recomputation from stored bytes. A SHA-256 string stored in a database is not proof that the underlying file matches it. Do not treat this as secure evidence storage yet.

## Production requirements
Private storage outside the web root, random storage keys, content validation, upload limits, malware scanning, access-controlled downloads, hash recomputation, immutable versions, backup/restore testing, and transaction/outbox consistency for metadata/events. Build and database integration tests were not run during packaging.
