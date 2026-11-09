# ForestOS Phase 150 — Management Command Centre

## Purpose
Unifies the supplied forestry, apiary, workforce, inspection, data-quality, corrective-action, and decision-action snapshots into a deterministic executive report.

## Run
From the repository root:
```bash
node scripts/phase150-management-command-centre.js --input=phase150-example-input.json --output=phase150-report.json --now=2026-10-29
node scripts/phase150-management-command-centre-contract-tests.js
```
Or from `apps/api` using npm scripts:
```bash
npm run command:phase150 -- --input=../../phase150-example-input.json --output=../../phase150-report.json --now=2026-10-29
npm run test:phase150:contract
```

## Input contract
- JSON object with `generatedAt` (`YYYY-MM-DD`) and `sections` object.
- Supported sections: `forestry`, `apiary`, `workforce`, `inspections`, `dataQuality`, `correctiveActions`, `decisionActions`.
- Any section may contain `metrics`, `status`, and/or `issues`; action sections may contain `actions`.
- Issue/action fields supported include `id`/`actionId`, `code`, `title`/`message`, `priority`, `status`, `dueDate`, `source`, and `recommendation`.
- Priority values: `critical`, `high`, `medium`, `low`, `info`.

## Management logic
- Health states: `urgent_attention`, `review_required`, `on_track`, `insufficient_data`.
- Critical open issues and blocked/urgent section statuses raise urgent attention.
- High/medium issues, explicit review flags, or missing sections raise review required.
- Missing sections and metrics remain explicitly unknown; they are never silently converted to zero.
- Priority register is sorted deterministically by priority, overdue status, due date, section, and identifier.
- Corrective action counts distinguish open and overdue actions; ineffective/reopened actions remain open.
- Decision proposals remain open until approved/rejected/completed/closed/cancelled.
- The report records which sections were supplied and that it came only from a local JSON snapshot.

## Production boundary
This is an offline reporting engine, not a live connected command centre. It does not query a production database or connectors, enforce user roles, perform authenticated writes, send notifications, verify evidence, or replace human safety decisions. Input correctness and freshness remain the operator's responsibility. Date comparisons use ISO calendar dates (UTC-neutral date strings). Review critical hazards promptly using established site procedures.
