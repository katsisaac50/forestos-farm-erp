# Phase 146 — Automated Data Integration Pipeline

## Purpose
Build a deterministic offline adapter between source reports and the Phase 145 unified dashboard input schema. It loads individual JSON reports, maps known field aliases, records source-file hashes and field-level lineage, and surfaces missing or unmapped metrics.

## Quick start
Create an `integration-manifest.json` in a folder with your exported source JSON files:
```json
{
  "generatedAt": "2026-10-28",
  "sources": {
    "forestry": {"path": "forestry-report.json"},
    "apiary": {"path": "apiary-report.json"},
    "workforce": {"path": "workforce-report.json"},
    "inspections": {"path": "inspection-report.json"},
    "verification": {"path": "verification-report.json"},
    "correctiveActions": {"path": "capa-report.json"},
    "recurringFailures": {"path": "recurring-failures-report.json"}
  }
}
```
Each source is a JSON file. The adapter recognizes common section names and aliases; see `scripts/phase146-automated-data-integration-pipeline.js` for the explicit mapping list. Missing source specifications are allowed but warned about; listed files are required unless `required: false`.

Run from the project root:
```bash
node scripts/phase146-automated-data-integration-pipeline.js --manifest=integration-manifest.json --output=integrated-report.json --now=2026-10-28
```
The output contains `dashboardInput` suitable for Phase 145, source hashes, file sizes, field-level lineage, source statuses, and warnings.

Then extract the `dashboardInput` object to a standalone `dashboard-input.json`, and run Phase 145:
```bash
node scripts/phase145-unified-farm-operations-dashboard.js --input=dashboard-input.json --output=dashboard-report.json --now=2026-10-28
```

## Source field groups
- `forestry`: tree count, planted acres, survival rate.
- `apiary`: hives, active colonies, honey kilograms.
- `workforce`: total/completed/overdue/blocked tasks and critical unverified tasks.
- `inspections`: total inspections, issues, high-severity issues, follow-ups.
- `verification`: submitted/approved/returned/rejected records, missing evidence, failed checklist items, quantity shortfalls.
- `correctiveActions`: open, overdue, ineffective, critical open actions.
- `recurringFailures`: pattern count and optional alert list.

## Data integrity and lineage
- Source files are read-only; the pipeline does not modify them.
- SHA-256 hash and byte count are recorded for each loaded source file.
- Field-level mapping shows which source field populated each normalized metric.
- Missing fields default to zero with explicit warnings. Review warnings before treating the dashboard as decision-grade.
- Numeric metrics must be finite and non-negative; forestry survival ratio must be between zero and one.

## Limitations
- Offline file-based integration only. No database/API connectors, automatic scheduling, web UI, access controls, notifications, or continuous sync.
- Field mapping is based on supported aliases, not arbitrary schema discovery. Review lineage and warnings; a metric may be defaulted to zero if its source schema differs.
- Does not automatically discover prior phase report files or guarantee that unlike source counts share the same reporting period.
- Phase 145 validates its own dashboard input and may reject inconsistent mapped totals; run it after integration and investigate validation errors.
