# Phase 147 — Data Quality & Reconciliation Engine

## Purpose
Phase 147 checks offline source snapshots for metric conflicts, missing values, stale/future reporting dates, duplicate source names, duplicate record identifiers/fingerprints, invalid numeric values, and invalid rule configuration. It produces a deterministic JSON review report.

## Input contract
Pass a JSON object with:
- `generatedAt`: optional report date (`YYYY-MM-DD`; CLI `--now` overrides it).
- `staleAfterDays`: optional non-negative integer, default `14`.
- `sources`: required array of `{ "name": "forestry", "asOf": "2026-10-27", "metrics": { "treeCount": 7000 } }`.
- `rules`: optional array of `{ "metric": "treeCount", "sources": ["forestry", "dashboard"], "tolerance": 0, "severity": "high" }`. Tolerance is an absolute numeric difference. If `sources` is omitted from a rule, all named sources are compared.
- `records`: optional array of `{ "source": "forestry", "recordId": "tree-001", "fingerprint": "sha256-or-other-stable-id" }`. Fingerprints are only compared within each source; this tool does not calculate them.

Example:
```json
{
  "generatedAt": "2026-10-28",
  "staleAfterDays": 14,
  "sources": [
    {"name":"forestry","asOf":"2026-10-27","metrics":{"treeCount":7000,"plantedAcres":7}},
    {"name":"dashboard","asOf":"2026-10-28","metrics":{"treeCount":6990,"plantedAcres":7}}
  ],
  "rules": [
    {"metric":"treeCount","sources":["forestry","dashboard"],"tolerance":0,"severity":"high"},
    {"metric":"plantedAcres","sources":["forestry","dashboard"],"tolerance":0}
  ],
  "records": [
    {"source":"forestry","recordId":"tree-001","fingerprint":"example-hash"}
  ]
}
```

## Run
From the repository root:
```bash
node scripts/phase147-data-quality-reconciliation-engine.js --input=reconciliation-input.json --output=reconciliation-report.json --now=2026-10-28
node scripts/phase147-data-quality-reconciliation-engine-contract-tests.js
```
Or from `apps/api`:
```bash
npm run reconcile:phase147 -- --input=../../reconciliation-input.json --output=../../reconciliation-report.json --now=2026-10-28
npm run test:phase147:contract
```

The CLI exits with code `2` when the report status is `blocked`, and code `1` for input/CLI errors. `ready` means no issues were detected under the supplied checks; it is not proof that the source data is truthful or complete.

## Status semantics
- `ready`: no issues detected by configured checks.
- `review_required`: issues exist but none trigger the blocking rules (for example, stale or missing metric warnings).
- `blocked`: unresolved metric conflicts, invalid source/metric/rule/record data, duplicate source names, future-dated sources, or duplicate record identifiers/fingerprints.

`qualityScore` is a simple heuristic (100 minus severity-weighted issue penalties, floored at zero), not a confidence percentage or audit certification. A missing metric can result in a `single_source` or `missing_metric` metric status, with a separate issue recorded.

## Limitations and next step
This phase is an offline JSON utility. It does not connect to MongoDB, the Phase 146 integration output automatically, cloud storage, external APIs, or the production dashboard. It does not automatically infer whether two fields from different systems represent the same business definition. Rules must be configured by a knowledgeable operator; the tool does not establish source-of-truth ownership, perform automatic repair, enforce access control, schedule runs, or send notifications. Reconciliation should be reviewed by an authorized person before operational or financial decisions.
