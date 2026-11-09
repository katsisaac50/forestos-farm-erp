# Phase 136 — Corrective Action Effectiveness & Continuous Improvement

## Purpose
An offline evaluator for assessing whether corrective actions are producing their intended outcomes and whether incident recurrence suggests a control remains weak.

## Input
Pass a JSON array or `{ "reviews": [...] }`. Each review includes review, incident and action IDs; root cause; intended outcome; pre/post metrics; evidence reference; reviewer; review date; and an outcome. Optional fields: incidentAt, repeatIncident, followUpActionId.

Metrics require matching names and finite numeric values. Outcomes: `EFFECTIVE`, `PARTIALLY_EFFECTIVE`, `INEFFECTIVE`, `INCONCLUSIVE`.

## Commands
- `npm run test:phase136:contract`
- `npm run improvement:phase136:review -- <input.json> [output.json]`

## Governance findings
Flags malformed or missing data, duplicate IDs, incompatible metrics, date-order problems, ineffective outcomes without linked follow-up, partial/inconclusive outcomes requiring further review, repeat incidents, and mixed outcomes for the same action.

## Phase 135 quality correction
Corrects the Phase 135 contract-test summary label from `20/19` to `20/20` if the file contains 20 declared tests.

## Boundaries
Offline JSON only. No persistence, action creation, notifications, evidence authentication, causal determination, or certification of operational effectiveness. Human reviewers must validate evidence and interpretation. Mixed-outcome detection is heuristic.
