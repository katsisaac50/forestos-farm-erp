# Phase 135 — Incident Register, Root-Cause & Corrective Actions

## Purpose
Offline JSON register evaluator for incident records, recurrence patterns, corrective action ownership, due dates, completion evidence, and closure governance.

## Run
```bash
node scripts/phase135-incident-register-corrective-actions.js \
  --register incidents.json \
  --as-of 2026-10-27T18:00:00Z \
  --out phase135-incident-register-report.json
```

## Incident fields
Required: `incidentId`, `title`, `reportedAt`, `severity` (`SEV1`–`SEV4`), `status` (`OPEN`, `INVESTIGATING`, `CONTAINED`, `MONITORING`, `CLOSED`), `owner`, `rootCauseCategory`, and `correctiveActions` array. Use `service` to group recurring issues.

## Corrective actions
Required: `actionId`, `description`, `owner`, `dueDate`, and `status` (`OPEN`, `IN_PROGRESS`, `BLOCKED`, `COMPLETE`, `CANCELLED`). Completed actions must include `completionEvidence`. Overdue and blocked actions are flagged.

## Closure policy
A closed incident needs `closedAt` and `closureApproved: true`. Closure requires human review. The tool checks supplied fields only; it cannot authenticate approvals or evidence.

## Limitations
Offline JSON analysis only. No database persistence, notifications, assignments, escalation, or production changes. Recurrence grouping is a heuristic and requires human review.
