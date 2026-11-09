# ForestOS Phase 97 — Secure Evidence Storage

## New API routes
All routes require JWT authentication and an active organization selected with `X-Organization-Id`.

- `POST /api/field-capture/:id/evidence` — multipart form field `file`
- `GET /api/field-capture/:id/evidence/:evidenceId` — authorized download

## Controls added
- Memory-buffer upload with a 15 MB maximum and one file per request.
- Content signature checks for JPEG, PNG, WebP and PDF; declared MIME type must match detected content.
- Server-generated evidence IDs and filenames; client filenames are metadata only.
- Private filesystem storage outside the public web root, organization-specific directory, restrictive file permissions where supported.
- SHA-256 digest stored at upload and verified before download.
- Organization-scoped capture lookup and evidence-manifest lookup.
- Download responses include `nosniff` and `private, no-store` headers.
- Maximum 10 evidence files per capture.

## Deployment requirements and limits
- Set `FORESTOS_EVIDENCE_ROOT` to a persistent private volume outside public/static directories. Back up and restrict access to this directory.
- Local filesystem storage is not a distributed storage solution. For multiple API instances, use private object storage with equivalent tenant-scoped authorization and short-lived signed URLs.
- Signature checks are not malware scanning. Integrate a malware scanner and document-content safety controls before production use.
- No delete/retention endpoint, quota system, audit event collection for downloads, or image EXIF stripping is implemented in this phase.
- Upload metadata is stored in the existing `evidenceManifest` field. Older metadata-only manifest entries without `storageKey` cannot be downloaded.
- Confirm that the API's global exception filter maps Multer file-size errors to a suitable 413 response.
- ZIP integrity checked only. Build, endpoint, file system, and database integration tests have not been run.
