# Phase 92 — Apiary Production Intelligence

## New endpoints
Both endpoints require a JWT, `X-Organization-Id`, and active membership:
- `GET /api/apiary-intelligence/dashboard`
- `GET /api/apiary-intelligence/productivity`

## Dashboard indicators
- Registered hives, inspection counts, and recent 30-day activity.
- Recorded honey totals and recorded harvest quantity over the last 30 days.
- Inspection colony-strength counts.
- Cumulative recorded harvest ranking by hive.
- Hives flagged for human attention when records show weak/queenless status,
  high pest/disease level, a missing inspection record, or an action-required note.

## Interpretation and limitations
- A missing inspection record does not prove that a colony is unhealthy.
- Rankings are cumulative kilograms, not standardized productivity per colony,
  per hive-day, or per season.
- Flags are operational prompts for a qualified person to review; they are not
  diagnoses or treatment instructions.
- Monthly quantities are grouped by UTC month and include recorded harvests only.
- Each query is organization-scoped; all linked data paths still require security
  and integration testing before production.

## Required validation
1. Run API build and database integration tests.
2. Verify a user cannot read another organization's dashboard or productivity data.
3. Verify date-window and timezone expectations with actual records.
4. Test empty datasets and malformed/old dates.
5. Verify hive and inspection records remain linked to the correct organization.
6. Consider pagination/aggregation pipelines for large datasets; current service
   uses bounded reads and in-memory aggregation.
