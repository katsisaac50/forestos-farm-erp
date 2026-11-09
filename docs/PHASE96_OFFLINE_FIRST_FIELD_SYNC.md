# ForestOS Phase 96 — Offline-First Field Sync

## What changed
- The field-work checklist attempts a foreground sync when connectivity returns and there are queued drafts.
- Manual sync remains available.
- A reusable field-capture queue helper now stores capture submissions locally, adds stable client submission IDs, and posts to `/api/field-capture` when online.
- The helper requires a login token and an active organization ID from `forestos_organization_id` or `forestos_active_organization`.
- Failed submissions remain queued with a visible-to-caller error field; sync continues with later items.

## Current limits and important behavior
- Browser localStorage is not encrypted; avoid shared devices and do not store sensitive data in drafts.
- Automatic sync is foreground-only and requires the page to be open. Background Sync API integration is not included.
- The field-work checklist queue and field-capture queue are separate stores.
- Existing SOP checklist sync sends queued snapshots to the SOP endpoint. Concurrent edits, multiple devices, and server-side conflicts are not automatically reconciled; inspect failed updates before retrying.
- `field-capture-queue.ts` expects the active organization ID to be stored under one of the documented localStorage keys. Align this with the organization selector used in deployment.
- Evidence manifest metadata is sent, not file bytes. Secure file upload/storage is still not implemented.
- No build, browser, or database integration tests were run. ZIP integrity was checked only.
