# Phase 38 — Worker Performance & Accountability Intelligence

## Delivered
- Added `/worker-accountability`, a read-only supervisor dashboard combining available corrective-action, field-inspection, and workforce summary endpoints.
- Summarises open/overdue/submitted/closed corrective actions and submitted/rejected inspections.
- Groups actions and inspections by their recorded assigned-worker identifier; shows workload and overdue follow-up counts.
- Shows recorded workforce totals when the owner-protected workforce endpoint is available.
- Adds links to the underlying workflow pages and a supervisor fairness/control guide.

## Data and permission notes
- The page requests `/corrective-actions`, `/field-inspections`, and `/workforce/dashboard` using the existing authenticated API helper. It tolerates individual endpoint failures and reports when one or more sources could not be loaded.
- `/workforce/dashboard` is owner-protected; therefore non-owner users may not see labour metrics. The page does not weaken that access control.
- Worker grouping uses assigned-worker text, not a canonical employee ID. Different spellings can split one person's records; identical labels can merge different people.
- This is a management aid, not a verified performance rating, automated disciplinary recommendation, payroll system, or audited record. Compare only like-for-like activities and review context with the worker.
- Corrective actions and inspections are existing recorded records. This page does not create or modify source records.

## Verification status
- Source files and archive structure checked.
- No claim of successful Next.js build, NestJS build, browser testing, database integration, or live permission testing. Run project install/build and role-based tests in a configured environment before deployment.
