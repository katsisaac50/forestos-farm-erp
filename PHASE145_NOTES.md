# Phase 145 — Unified Farm Operations Intelligence & Executive Dashboard

## Purpose
Create a single deterministic executive snapshot across eucalyptus forestry, apiary, workforce, inspections, verification, corrective actions, and recurring-failure signals.

## Run
```bash
node scripts/phase145-unified-farm-operations-dashboard.js --input=dashboard-input.json --output=dashboard-report.json --now=2026-10-28
node scripts/phase145-unified-farm-operations-dashboard-contract-tests.js
```

## Input contract
Use one manually consolidated JSON object with optional sections:
```json
{
  "generatedAt": "2026-10-28",
  "forestry": {"treeCount": 7000, "plantedAcres": 7, "survivalRate": 0.93},
  "apiary": {"hives": 10, "activeColonies": 1, "honeyKg": 0},
  "workforce": {"tasks": {"total": 10, "completed": 5, "overdue": 2, "blocked": 1, "criticalUnverified": 1}},
  "inspections": {"total": 5, "issues": 3, "highSeverity": 1, "followUps": 2},
  "verification": {"submitted": 3, "approved": 2, "returned": 1, "rejected": 0, "missingEvidence": 2, "failedChecklistItems": 1, "quantityShortfalls": 1},
  "correctiveActions": {"open": 4, "overdue": 1, "ineffective": 0, "criticalOpen": 1},
  "recurringFailures": {"patterns": 2, "alerts": [{"code":"manual_review","severity":"high","message":"Review repeat issue"}]},
  "kpis": [{"name":"Tree survival","value":0.93,"target":0.95,"unit":"ratio"}]
}
```
All metrics are non-negative finite numbers; `forestry.survivalRate` must be from 0 to 1. Missing metrics default to zero and are disclosed as data-quality warnings. Completion/approval/issue rates are null when their denominators are zero. Completed tasks may not exceed total tasks. Approval count may not exceed submitted count when submitted is nonzero.

## Outputs
- Executive readiness indicator (`green`, `amber`, `red`) driven by rule-based alert severity.
- Forestry/apiary operating metrics.
- Workforce completion, inspection issue and verification approval rates.
- Alerts, KPI target gaps, and ranked operational priorities.
- Data-quality warnings and report metadata.

## Important limitations
- Offline JSON snapshot only; it is not a live dashboard and does not automatically ingest prior phase outputs.
- No database, API endpoint, frontend, user authentication, notification delivery, or scheduled refresh.
- Readiness is a simple rule-based signal, not a compliance certification, safety assurance, financial forecast, or substitute for supervisor judgement.
- Input must be exported or consolidated by a person until adapters are built.
