# ForestOS Phase 141 — CAPA Management

## Purpose
Offline Corrective Action and Preventive Action (CAPA) reporting that turns inspection findings and recurring farm problems into accountable improvement work.

## Run
```bash
node scripts/phase141-capa-management.js --input=records.json --output=report.json --now=2026-10-28
node scripts/phase141-capa-management-contract-tests.js
```
Use `--now` for reproducible deadline and review logic; without it, the machine's current UTC date is used.

## Data
Top-level `cases` array. Each case needs `id`, `sourceType`, `sourceId`, `area`, `problem`, `severity` (`low|medium|high|critical`), `owner`, `openedDate`, `dueDate`, and `status` (`open|in_progress|pending_verification|closed|cancelled`). Optional fields: `rootCause`, `repeatIssue`, `correctiveActions`, `preventiveActions`, `effectivenessReview`. Actions need unique `id`, `title`, `owner`, `dueDate`, and `status` (`open|in_progress|blocked|completed|cancelled`); optional evidence references are strings. Effectiveness reviews use `reviewDate`, boolean `effective`, `reviewer`, and optional `notes`.

## Reporting and controls
Produces case/action KPIs, completion and effectiveness rates, overdue/blocked escalations, high/critical open case escalations, repeat-issue flags, ineffective reviews, closure-control exceptions, and recommendations. Closed cases are checked for a root cause, completed/cancelled actions, and an effective review on or before the report date.

## Limitations
Offline JSON only: no database, API, GUI, authentication, alerts, or synchronization. Evidence references are not verified. Closure-control exceptions are reported but supplied case status is not automatically changed. Use as decision support, not a substitute for field inspection, agronomy advice, or management approval.
