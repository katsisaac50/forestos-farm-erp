# ForestOS Phase 142 — Farm Task Scheduling & Workforce Execution

## Purpose
Offline task register and execution report for eucalyptus forestry and beekeeping operations. Tasks may include planting, gap replanting, weeding, pruning, firebreak work, pest/disease checks, survival checks, soil/water work, hive inspections/repairs, harvest, and linked CAPA actions.

## Run
```bash
node scripts/phase142-farm-task-execution.js --input=tasks.json --output=report.json --now=2026-10-28
node scripts/phase142-farm-task-execution-contract-tests.js
```
Use `--now` to make deadline calculations reproducible. Without it, the engine uses the current UTC date.

## Task lifecycle
Statuses: `planned`, `assigned`, `in_progress`, `blocked`, `submitted`, `verified`, `returned`, `cancelled`. Tasks record an owner, creator, priority, work area, start/due dates, optional estimate and quantities, evidence references, verifier fields, and optional `linkedCapaId`.

## Reporting
Includes task status KPIs, overdue and critical work escalations, blocked/returned work, per-area and per-owner summaries, quantity totals, verification rate, and recommendations. A verified task without a valid verifier/date is flagged. Quantity shortfalls are highlighted rather than automatically treated as failure.

## Limitations
JSON/offline only: no database persistence, UI, authentication, notifications, calendar integration, actual worker accounts, or sync. Evidence is stored as references and not inspected. This engine summarizes supplied records; it does not schedule workers automatically or verify field work itself.
