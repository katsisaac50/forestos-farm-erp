# Phase 73 — Secure Evidence Upload & File Integrity Verification

## Delivered
- Owner-role-protected multipart upload endpoint: `POST /api/case-evidence/upload` with `caseId`, `evidenceCode`, optional `description`, and `file`.
- 10 MiB upload cap, one file per request, PDF/PNG/JPEG signature allow-list. Client-supplied MIME type is not trusted.
- Random server-generated storage names; original filename is reduced to a basename and sanitized.
- Private directory from `EVIDENCE_STORAGE_DIR` (default `./private-evidence` relative to the API process working directory), created with restrictive directory/file modes where the host OS supports them.
- SHA-256 is computed from the bytes actually received; byte length and hash are stored with the evidence record.
- Owner-only download endpoint: `GET /api/case-evidence/:id/download`. The server reads from the private directory, recomputes SHA-256 and size, and withholds a file on mismatch. A mismatch attempts to mark the record quarantined and append an audit event.
- UI upload form and verified-download action on `/case-evidence`.

## API usage
Upload a multipart form to `/api/case-evidence/upload` with a valid owner bearer token. Required fields: `caseId`, `evidenceCode`, and `file`. Optional: `description`.
Download via `/api/case-evidence/:id/download` with the same owner authentication.

## Important operational limitations
- This is a starter security layer, not a complete evidence-management certification.
- No malware scanning, content disarm/reconstruction, image/PDF deep parsing, encryption-at-rest, immutable/WORM storage, external backup, retention policy, or incident alerting is included.
- Signature checks reject unsupported formats but do not prove that a PDF or image is benign.
- The filesystem and MongoDB are not one transaction. The service attempts cleanup if database/event creation fails; operators should reconcile orphaned files after crashes.
- Audit event and evidence record writes are separate database writes. A database outage between them can leave an incomplete audit trail.
- Configure `EVIDENCE_STORAGE_DIR` to a durable, private volume with backups and strict OS permissions. Do not expose this directory through Next.js, a static file server, or a public reverse-proxy route.
- Deploy behind HTTPS, use strong JWT secrets, keep owner-only access, monitor disk usage, and test restore procedures before storing real sensitive documents.
- No malware scan is performed. Do not treat uploaded content as safe merely because its signature matches an allowed type.

## Verification status
Source-level changes and archive structure were reviewed. Build, browser, security penetration, and live MongoDB integration tests have not been run in this environment. Before production use, test upload size enforcement, unsupported and spoofed file signatures, duplicate evidence codes, unauthorized access, missing files, tampered bytes, disk-full behavior, and recovery after partial failures.
