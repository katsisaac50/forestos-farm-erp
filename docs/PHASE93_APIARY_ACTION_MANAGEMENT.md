# ForestOS Phase 93 — Apiary Follow-Up & Action Management

## Purpose
Convert inspection findings into owned, prioritized follow-up work. Every action and event is organization-scoped.

## API
All routes require a JWT and `X-Organization-Id` for an active organization membership.

- `GET /api/apiary-actions?status=Open&hiveId=HIVE-001&overdueOnly=true&limit=100`
- `POST /api/apiary-actions`
- `PATCH /api/apiary-actions/:id`
- `GET /api/apiary-actions/summary`
- `GET /api/apiary-actions/:id/history`

Create payload example:
```json
{
  "hiveId": "HIVE-001",
  "sourceInspectionId": "66f...",
  "title": "Recheck colony strength",
  "description": "Inspect food stores and brood pattern.",
  "priority": "High",
  "assignedTo": "field-worker-1",
  "dueDate": "2026-11-01T09:00:00.000Z"
}
```
`sourceInspectionId` is optional but, when supplied, must refer to an inspection for the same hive and organization. Hive ownership is checked before creation. Updates accept only a whitelist of action fields; tenant identifiers, action identifiers and creator fields cannot be overwritten through the DTO.

## Operational notes
- Statuses: Open, In progress, Blocked, Completed, Cancelled.
- Priorities: Low, Medium, High, Critical.
- Completing an action records `completedAt`; reopening/other status changes clear it.
- Creation and update events are recorded in a tenant-scoped event collection. History is scoped to the selected organization.
- The summary scans at most 10,000 records and is suitable only as an initial bounded implementation. Move to MongoDB aggregation/pagination before large-scale use.
- `assignedTo` is currently a text identifier, not a verified user assignment. Add directory resolution, role-based write policy and notifications before production deployment.
- Review Mongoose schema validation and test behavior against the project's installed TypeScript/Mongoose versions. This phase ZIP has integrity checks only; no build or database integration suite was run.
