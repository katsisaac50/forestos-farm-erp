# ForestOS Phase 94 — Field Workforce & Task Execution

## Purpose
Adds organization-scoped worker profiles and field task execution, including worker acceptance, progress, blocked work, submission, supervisor review, evidence references and a task event history.

## API
Every route requires JWT authentication and `X-Organization-Id` for an active organization membership.

- `GET /api/field-workforce/workers`
- `POST /api/field-workforce/workers` — manager/supervisor only
- `GET /api/field-workforce/tasks?status=Assigned&workerId=FW-...&overdueOnly=true&limit=100`
- `POST /api/field-workforce/tasks` — manager/supervisor only
- `PATCH /api/field-workforce/tasks/:id/status`
- `GET /api/field-workforce/tasks/summary`
- `GET /api/field-workforce/tasks/:id/history`

Create worker example:
```json
{ "displayName": "Field Worker 1", "phone": "+256...", "skills": "apiary inspection, hive maintenance" }
```

Create task example:
```json
{
  "title": "Inspect hive HIVE-001",
  "description": "Check colony strength and food stores.",
  "priority": "High",
  "workerId": "FW-...",
  "apiaryActionId": "AA-...",
  "dueDate": "2026-11-02T09:00:00.000Z"
}
```

Task status transitions include Assigned → Accepted → In progress → Submitted → Approved, with Blocked and Rejected paths. Workers may update their own assigned task when the authenticated identity matches the worker identifier; manager/supervisor roles can administer task transitions. To make worker identity reliable, workerId must currently match the authentication subject/email used by the API; a dedicated account-to-worker mapping is still required.

`evidenceReferences` stores reference strings only; it does not upload or verify files. Add a secure evidence upload service and malware/type/size checks before production use.

## Security and scale notes
- Every task/worker/action query is scoped to the active organization.
- Task creation checks the worker and optional linked apiary action within that organization.
- Write operations for worker/task creation require a recognized manager/supervisor role.
- Manager role labels are case-sensitive variants listed in service code; align them to canonical membership roles before rollout.
- Summary uses a bounded 10,000-row scan and should be converted to aggregation for large datasets.
- ZIP integrity is checked; application build, DB integration and browser tests have not been run.
