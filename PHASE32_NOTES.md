# ForestOS Phase 32 — Photo Evidence Upload & Review

## Included
- Browser image resize/compression before upload; max edge 1800 pixels and server upload limit 4,000,000 bytes.
- Authenticated upload endpoint with JPEG/PNG/WebP allowlist.
- Random server filename, SHA-256 metadata and file storage outside the public web root.
- Evidence register with owner approval/rejection and required review note.
- File retrieval endpoint checks uploader identity or owner role.

## Critical limitations
- Default file storage is local server disk (`FORESTOS_EVIDENCE_DIR`); configure persistent private storage before deployment.
- File retrieval requires bearer authentication. A normal new browser tab may not send the bearer token; a proper authenticated image viewer is still needed.
- Existing JWT role/guard behavior must be tested; owner detection relies on role claims.
- No malware scanning, rate limiting, object storage, offline photo queue, or automatic retention policy.
- No TypeScript build, live API/database or browser tests were performed. ZIP integrity and required-file presence only.
