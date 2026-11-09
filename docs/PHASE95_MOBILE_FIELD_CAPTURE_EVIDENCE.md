# ForestOS Phase 95 — Mobile Field Capture & Evidence Manifest

## Goal
Add a mobile-friendly, retry-safe API for submitting field notes, optional GPS coordinates with explicit consent, and evidence metadata; managers can review submissions.

## Routes
All require JWT and an active membership selected by `X-Organization-Id`.

- `POST /api/field-capture`
- `GET /api/field-capture?taskId=FT-...&reviewStatus=Submitted&limit=100`
- `PATCH /api/field-capture/:id/review`

Submission example:
```json
{
  "clientSubmissionId": "offline-generated-unique-id",
  "taskId": "FT-...",
  "captureType": "Task completion",
  "title": "Completed hive inspection",
  "notes": "Colony strength moderate; food stores adequate.",
  "locationConsent": false,
  "evidenceManifest": []
}
```

For evidence manifest entries, each item needs filename, allowed MIME type (JPEG, PNG, WebP or PDF), sizeBytes up to 15 MB, and a 64-character SHA-256 hex digest. At most 10 entries are accepted. This phase validates metadata only: it does **not** upload, store, scan or serve file bytes. Do not treat manifest records as proof the file exists or is safe.

GPS data is only stored when `locationConsent` is explicitly true and coordinates validate. Client-side permission prompts and user controls still need to be built.

## Retry and review
`clientSubmissionId` is unique per organization. A repeated submission with the same ID returns the existing record to support retry-safe clients. Managers/supervisors can mark evidence Reviewed or Needs changes with notes.

## Production gaps
- Real offline queue and synchronization UI are not implemented in this backend phase.
- Add secure object storage, signed upload/download URLs, file signature inspection, malware scanning, retention/deletion controls and upload authorization before handling real evidence.
- Align worker identity mapping and manager role names with canonical auth records.
- Review idempotency behavior under concurrent requests; duplicate-key handling should be normalized to return the existing record.
- ZIP integrity checked only; no application build or DB integration tests were run.
