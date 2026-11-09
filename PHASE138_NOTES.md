# Phase 138 — Management KPI Dashboard & Analytics

## Purpose
Creates an offline management KPI report from supplied incident, improvement-action, effectiveness-review, and operational-compliance records. The JSON output is suitable as a feed for a future dashboard.

## Input
A JSON object may contain arrays named `incidents`, `actions`, `reviews`, and `operations`.
- incidents: status and severity fields
- actions: status, priority, and dueAt fields
- reviews: outcome and repeatIncident fields
- operations: area and boolean compliant fields

## Commands
- `npm run test:phase138:contract`
- `npm run analytics:phase138:kpi -- <input.json> [output.json]`
- For reproducible reports: append `--now 2026-10-27T12:00:00Z`.

## KPIs
Incident totals, open/closed counts, high-severity count and closure rate; improvement action totals, completion rate, overdue/blocked/critical open actions; effectiveness outcomes and repeat incidents; operational compliance by area; rule-based management recommendations.

## Important limits
The evaluator uses only fields present in supplied data. Missing datasets are treated as empty; rates are null if no denominator exists. Operational compliance means only the supplied `compliant` boolean, not an independent audit. No charts, database persistence, authentication, permissions, automatic notifications, or live integration are introduced in this phase.
