# Phase 133 — Post-Change Verification & Operational Monitoring

## Purpose
Create an offline, evidence-driven checklist and baseline/post-change metric comparator for inventory migration operations.

## Run
```bash
node scripts/phase133-post-change-verification.js \
  --checklist checklist.json \
  --baseline baseline.json \
  --post-change post-change.json \
  --release-decision phase132-release-decision.json \
  --out phase133-post-change-verification.json
```

## Required checklist
The checklist must include a change ticket, operator, timestamp, monitoring window, rollback owner, and passing booleans for application health, tenant-isolation smoke tests, inventory counts, movement ledger, error rate, latency, alerts, backup availability, rollback readiness, and business-owner sign-off.

## Metrics
Both baseline and post-change JSON objects must contain finite numeric values for:
`stockItemCount`, `stockMovementCount`, `unassignedItemCount`, `unassignedMovementCount`,
`tenantConflictCount`, `duplicateCodeCount`, `errorRatePercent`, and `p95LatencyMs`.

Integrity regressions block verification; count changes require explanation; performance regressions require review.

## Safety
This tool does not observe a live system and does not verify metric provenance. A complete checklist is pending human sign-off only; deployment, migration and production certification remain disabled. No database reads or writes are performed.
