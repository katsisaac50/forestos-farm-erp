# Phase 132 — Inventory Migration Release Decision & Evidence Pack

## Purpose
Add an offline decision evaluator that assembles the evidence needed for a human-reviewed inventory migration release decision.

## Inputs
- `--evidence evidence.json`: preflight, rehearsal, backup/restore, index/duplicate-key review, independent reviewer and change-ticket evidence references.
- `--reconciliation phase131-reconciliation-report.json`: Phase 131 reconciliation output.

## Example
```bash
node scripts/phase132-inventory-migration-release-decision.js \
  --evidence evidence.json \
  --reconciliation phase131-reconciliation-report.json \
  --out phase132-release-decision.json
```

The evidence file is a local operator-supplied record. Example shape:
```json
{
  "environment": "staging",
  "mutationEnabled": false,
  "preflightPassed": true,
  "rehearsalPassed": true,
  "backupVerified": true,
  "restoreTestPassed": true,
  "indexReviewPassed": true,
  "duplicateKeyReviewPassed": true,
  "independentReviewerApproved": true,
  "changeTicket": "CHG-EXAMPLE",
  "backupEvidenceRef": "evidence://backup/run-id",
  "restoreEvidenceRef": "evidence://restore/run-id",
  "reviewer": "independent-reviewer",
  "reviewedAt": "2026-10-27T10:00:00Z"
}
```

## Decision semantics
- Any blocker produces `NO_GO`.
- A clean evidence pack yields only `CONDITIONAL_GO_FOR_SEPARATE_CHANGE_AUTHORITY_REVIEW`.
- `mayExecuteMigration` and `mayTargetProduction` remain `false` for every result.
- Automatic rollback authorization remains `false`.

## Safety boundaries
This evaluator does not verify that evidence references are genuine, connect to MongoDB, execute migrations, alter indexes, restore backups, or run application integration tests. A human operator must verify referenced artifacts and the change plan. Do not interpret a conditional result as permission to migrate.
