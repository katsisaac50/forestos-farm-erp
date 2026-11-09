# ForestOS Phase 35 — Field Inspection & Location Integration

## Included
- Authenticated field inspection API and `/field-inspections` page.
- Inspection assignment linked to existing Phase 33 map feature coordinates.
- Worker submission of findings, corrective actions and optional evidence reference.
- Owner review workflow: submitted → verified or rejected, with mandatory review note.
- Location-based external directions.

## Use
1. Add farm map features in `/farm-map`.
2. Open `/field-inspections`.
3. Select a mapped location and assign it using the worker's login email/username identifier.
4. The assigned worker signs in, records findings/corrective action and submits for review.
5. An owner reviews the submitted record and verifies it or returns it for correction.

## Important limitations
- The implementation matches the assigned worker string to the authenticated actor identifier; check that your auth token exposes `email`, `username`, or `sub` consistently.
- Owner detection uses `req.user.roles` or `req.user.role`; verify your deployed JWT payload/role guard conventions before production use. UI visibility is not a security boundary; API authorization must be tested.
- This is a location-linked inspection register, not an automatic integration into the existing SOP run/checklist workflow.
- Evidence is stored as a reference string only; this phase does not attach a Phase 32 photo or validate evidence IDs.
- Polygon coordinates use an approximate average-vertex point, which is not guaranteed to be a safe access point.
- No build, browser, API, authorization, or database tests were run. ZIP integrity and required-file presence were checked only.
