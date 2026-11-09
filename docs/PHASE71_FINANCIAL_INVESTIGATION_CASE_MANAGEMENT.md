# Phase 71 — Financial Investigation Case Management

## Included
- Owner-protected API module for listing, creating, inspecting, updating, second-reviewing, and reopening investigation cases.
- MongoDB case and case-event schemas.
- DTO validation for create/update payloads.
- Status/severity filtering, assignment, evidence references, notes, resolution summary, reopen reason, and event history.
- Optimistic version check when `expectedVersion` is supplied.
- High/critical cases require a second reviewer before closure; case creator cannot perform the independent review.
- Web route `/financial-investigation-cases`, linked from the home navigation.

## API routes
- `GET /api/financial-investigation-cases?status=&severity=`
- `GET /api/financial-investigation-cases/:id`
- `POST /api/financial-investigation-cases`
- `PATCH /api/financial-investigation-cases/:id`
- `POST /api/financial-investigation-cases/:id/second-review`
- `POST /api/financial-investigation-cases/:id/reopen`

## Known limitations
Case writes and event inserts are separate database operations, not a transaction; interruption can leave event history incomplete. Evidence is stored as a reference string, not a secure uploaded file. Build and database integration tests were not run during packaging. Treat this as an initial implementation requiring tests and hardening before production use.
