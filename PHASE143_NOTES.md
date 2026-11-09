# Phase 143 — Supervisor Verification & Field Evidence Management

## Purpose
Make task completion auditable: a worker submission is not the same as verified completion. This offline contract/report engine checks supervisor decisions, evidence references, quality checklist results, reported-vs-planned quantities, rework assignment, and overdue items.

## Run
```bash
node scripts/phase143-supervisor-verification-evidence.js --input=records.json --output=report.json --now=2026-10-28
node scripts/phase143-supervisor-verification-evidence-contract-tests.js
```
Input format: `{ "records": [ ... ] }`. Each record includes `id`, `taskId`, `worker`, `submittedDate`, `status`; optional fields include `area`, `taskType`, `plannedQuantity`, `reportedQuantity`, `unit`, `evidence`, `evidenceRequired`, `checklist`, `review`, `rework`, and `linkedCapaId`.

Evidence objects require a unique global `id`, `type` (`photo`, `document`, `measurement`, `other`), `reference`, and valid `capturedDate`. References are identifiers/paths only; this engine does not open or verify files. Checklist results are `pass`, `fail`, `not_applicable`, or `pending`. Approval requires all required criteria to pass, a matching supervisor approval, and evidence by default. Set `evidenceRequired:false` only for a documented exception. An approved reported quantity below planned quantity requires `review.quantityAccepted:true`. Returned/rejected records require a reason, assignee, due date, and rework status.

## Report outputs
Status counts, review/approval rates, evidence totals and missing-evidence counts, failed checklist items, quantity shortfalls, open/overdue rework, overdue reviews, validation errors, warnings, and attention items. The `--now` date makes results deterministic for testing and backdated reviews.

## Limitations / production gates
This is an offline JSON validation/report tool. It is not connected to ForestOS database, task scheduler, worker identities, login/permissions, cloud photo storage, GPS/time metadata verification, CAPA service, notifications, or mobile sync. It does not prove that evidence is authentic or that field work was physically inspected. Before production use, add authenticated reviewer permissions, immutable event/audit storage, secure evidence uploads with hashes and access controls, tenant/plantation scoping, API integration, and human approval procedures.
