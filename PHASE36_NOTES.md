# ForestOS Phase 36 — Inspection Analytics & Corrective Action Tracking

## Included
- Authenticated corrective-action register and `/corrective-actions` page.
- Low/medium/high/critical priorities and due-date overdue status.
- Worker assignment, completion notes, submission and owner review.
- Workflow: open → in progress → submitted → closed or returned to work.
- Summary analytics by status, priority and block/location; overdue count, completion rate and on-time closure rate.

## Use
1. Sign in and open `/corrective-actions`.
2. Create an action, due date and assigned worker; optionally enter a source inspection ID.
3. Assigned worker updates progress and submits with a completion note.
4. Owner reviews submitted actions and closes them or returns them to work.
5. Refresh to recompute analytics.

## Limitations
- Source inspection IDs are text only and are not validated against field inspection records.
- Actions are not automatically created from inspection findings.
- Worker access compares the assigned string with authenticated `email`, `username` or `sub`; verify JWT claims.
- Owner checks use `req.user.roles` or `req.user.role`; test against your deployment.
- Analytics describe recorded actions, not overall farm performance or legal compliance.
- No build, browser, API, authorization or database tests were run. ZIP integrity and required-file presence were checked only.
