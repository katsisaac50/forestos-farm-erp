# Phase 140 — Farm Operations & Field Inspection System

## What it adds
An offline JSON reporting engine for eucalyptus field inspections, apiary inspections, assigned maintenance tasks, overdue work, blocked tasks, and escalation queues.

## Supported task types
`tree_mortality`, `gap_replanting`, `weeding`, `firebreak`, `pest_disease`, `pruning`, `soil_water`, `apiary_inspection`, `hive_repair`, `harvest`, `other`.

## Input example
```json
{
  "inspections": [
    {"id":"I-1","area":"Block A","date":"2026-10-27","inspector":"Field Lead","issueCount":2,"severity":"high","followUpRequired":true,"notes":"Mortality patch"}
  ],
  "tasks": [
    {"id":"T-1","area":"Block A","type":"gap_replanting","title":"Replant mortality patch","owner":"Worker A","dueDate":"2026-10-30","priority":"high","status":"open","evidence":[]}
  ]
}
```
Inspection fields: `area`, `date` (YYYY-MM-DD), `inspector`, optional `issueCount` (non-negative integer), `severity` (`low`, `medium`, `high`, `critical`), `followUpRequired` (boolean), `notes`.
Task fields: `area`, `type`, `title`, `owner`, `dueDate` (YYYY-MM-DD), `priority`, `status` (`open`, `in_progress`, `blocked`, `completed`, `cancelled`), and optional `evidence` array of references.

## Run
`node scripts/phase140-farm-operations-inspections.js --input=records.json`
Optional `--output=report.json` writes a report file. Optional `--now=2026-10-28` supports deterministic due-date checks and testing.
Run contract tests with `node scripts/phase140-farm-operations-inspections-contract-tests.js`.

## Limitations
This is an offline reporting module. It does not persist data, provide a graphical interface, authenticate users, send notifications, or sync to a server. Completion evidence is only referenced, not verified. Keep safety-critical work under approved farm procedures and local requirements.
