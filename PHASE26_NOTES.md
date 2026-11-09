# ForestOS Phase 26 — Automated KPI Integration & Performance Intelligence

## Delivered
- Owner-only read-only metric catalog at `GET /api/performance-intelligence/catalog`.
- Owner-confirmed metric application at `POST /api/performance-intelligence/apply`.
- UI at `/performance-intelligence`, linked from the home navigation.
- Metrics include recorded monthly finance income/expenses, stock item count, low-stock count, estimated inventory value, workforce task counts, and pending/failed workflow event counts.
- A KPI update stores the selected metric key/source timestamp in its evidence reference.

## Important limits
- This is a controlled suggestion-and-apply workflow, not unattended automatic posting.
- Metrics are computed from bounded or current source records. Finance metrics read up to 10,000 matching income and expense records each; stock and task reads are limited to 10,000 each. Workflow pending/failed metrics use database counts.
- Monthly finance values use transaction dates and recorded directions. They are not reconciled cash, audited revenue, or a full profit calculation.
- Inventory value is quantity on hand multiplied by recorded average unit cost, not a verified accounting valuation.
- Workforce completed tasks means `verified`; overdue tasks use planned date and current status.
- Metric application checks exact unit match and date windows. It creates a performance update only; it does not change source modules.
- The current catalog provides snapshot metrics for some keys, so they can only be applied when the chosen update date is inside that metric's snapshot window. Monthly finance metrics can be applied only within the current month window.
- No build, compile, live API, database, authentication, or browser test was run while creating this archive. Review and test in a development environment before operational use.

## Suggested verification
1. Install dependencies and run the project's documented checks.
2. Start a disposable development MongoDB and API.
3. Confirm an owner can read the catalog but a non-owner cannot.
4. Test matching and mismatching units and date boundaries.
5. Verify applying a metric creates one KPI update and leaves source records unchanged.
6. Check metric limits and totals against known test fixtures.
