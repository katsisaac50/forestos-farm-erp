# ForestOS Phase 30 — Worker Mobile App & Offline Checklists

## Included
- Mobile-first `/field-work` route for assigned SOP runs.
- Authenticated `GET /api/sops/my-runs` returns runs whose `assignedTo` matches the JWT actor identifier.
- Local checklist draft queue, online/offline status and explicit manual sync.
- Failed updates remain queued for review.

## Assignment requirement
The SOP run `assignedTo` value must match the authenticated actor's email, username or `sub` claim. Existing display-name assignments may not match. This endpoint intentionally does not expose all runs to a worker.

## Limitations
- Browser local storage is not encrypted; avoid shared devices and sync promptly.
- Manual sync only: no background sync, photo upload, push notifications or automatic conflict resolution.
- A local draft is not server-confirmed completion. The existing SOP API remains authoritative.
- No TypeScript compilation, build, API, database or browser tests were performed.
