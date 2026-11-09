# ForestOS Phase 29 — SOPs, Checklists & Work Verification

## Delivered
- Owner-only SOP template management, default template seeding and scheduling at `/sops`.
- Starter SOPs: eucalyptus daily block walk/hazard check; eucalyptus weekly survival/growth sample; beekeeping weekly external inspection; beekeeping monthly colony/equipment review; general weekly farm management review.
- Each run records location, assigned person, date, checklist results, notes, evidence references and exception notes.
- Run workflow: open → in progress → submitted → verified/rejected.
- Only the assigned person (matched by the assignedTo value against the authenticated actor identifier) or owner can update checklist results; only owner can verify/reject submitted work.
- Required checklist items must be marked done or not applicable before submission. A rejection requires a verification note.
- Read-only overview uses plantation, hive and inspection records for context.
- API endpoints under `/api/sops`: `overview`, `templates`, `seed-defaults`, `POST templates`, `PATCH templates/:id/status`, `runs`, `POST runs`, and `PATCH runs/:id`.

## Important limits
- `assignedTo` is currently a plain text value, not a verified worker/account relationship. For non-owner updates it must match the authenticated actor identifier exactly (case-insensitive); use the account email/identifier the auth guard supplies. A proper worker-to-user mapping is a future hardening task.
- The page is a starter owner workspace. It does not yet provide a dedicated worker mobile experience, recurring schedule generator, push/email reminders, photo upload, digital signature, offline synchronization or automatic task creation.
- Checklist completion is a recorded assertion. Supervisors should inspect evidence and physical conditions rather than treating ticks as proof.
- Default SOPs are generic starting points. Adapt them to local conditions, trained staff, safety requirements and Ugandan forestry/beekeeping guidance before activation.
- The frontend's “save before submitting” action is intentionally separate from submission. Save checklist results first, then submit after verifying required items.
- No compile/build, live API/database, role/auth or browser test was run while creating this archive. Test in a disposable development environment before operational use.

## Suggested verification
1. Sign in as owner and seed default templates twice; confirm no duplicate templates and no overwrites.
2. Activate/review a template and schedule a run.
3. Verify assigned actor can update; unrelated actor cannot.
4. Confirm required checklist rules block incomplete submission.
5. Confirm only owner can verify/reject, and rejection requires a note.
6. Confirm completed/cancelled runs cannot be edited through the standard update endpoint.
