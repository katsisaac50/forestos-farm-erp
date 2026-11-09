# Phase 144 — Automated Corrective Action & Recurring-Failure Intelligence

## Purpose
Identify recurring forestry/apiary failures by a stable `signature` and `area`, surface overdue corrective actions, and track whether actions were marked effective or ineffective.

## Run
```bash
node scripts/phase144-recurring-failure-intelligence.js --input=dataset.json --output=report.json --now=2026-10-28 --threshold=2
node scripts/phase144-recurring-failure-intelligence-contract-tests.js
```

## Input
```json
{
  "failures": [
    {"id":"F-001","title":"Firebreak gap","signature":"firebreak_gap","area":"Block A","type":"firebreak","severity":"high","source":"inspection","date":"2026-10-20","capaId":"CAPA-01"}
  ],
  "actions": [
    {"id":"CAPA-01","title":"Repair firebreak","status":"open","severity":"critical","dueDate":"2026-10-25","failureIds":["F-001"]}
  ]
}
```
Failure `source` is one of `inspection`, `task_verification`, `capa`, `incident`, or `other`. Severity is `low`, `medium`, `high`, or `critical`. Corrective action states: `open`, `in_progress`, `implemented`, `verification_pending`, `effective`, `ineffective`, `closed`, `cancelled`. The default recurrence threshold is two failures with the same signature in the same area; use `--threshold=N` to adjust it. Recurrence is a rule-based grouping, not machine learning or a causal determination.

## Outputs
Recurring patterns with first/last seen dates, highest severity, failure IDs and linked CAPA IDs; ranked affected areas and failure types; overdue action and ineffective-action alerts; summary metrics and input validation issues.

## Production limitations
Offline JSON only. It does not automatically ingest Phase 140–143 data, persist an audit log, infer root causes, notify supervisors, or prove corrective action effectiveness. Failure records must be supplied in a consolidated input dataset. A production rollout needs tenant-scoped APIs, identity/permissions, durable event history, integrations, and a human-reviewed root-cause/effectiveness process.
