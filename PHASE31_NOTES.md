# ForestOS Phase 31 — GPS Field Verification & Supervisor Approval

## Included
- A new MongoDB field-verification register and authenticated API module.
- Records SOP run ID, worker login identifier, farm block, activity type, GPS coordinates, device-reported accuracy, evidence reference and note.
- Workers can list their own submissions; owners can list all records and approve/reject submitted records with a required review note.
- Mobile-friendly `/field-verification` page uses browser geolocation.
- Evidence is a reference to an existing photo/evidence record. This phase does not upload or store image bytes.

## Cautions
- Geolocation normally requires HTTPS or localhost and user permission.
- GPS is not proof of work; device location may be inaccurate or spoofed.
- Worker identifier must match the authenticated email, username or subject claim.
- Confirm the project's JWT role claim and `@Roles` guard behavior before field rollout.
- Evidence references are not cross-validated with the existing evidence module.
- No compilation/build, live API/database, authorization or browser tests were performed. ZIP integrity and expected-file presence are checked.
