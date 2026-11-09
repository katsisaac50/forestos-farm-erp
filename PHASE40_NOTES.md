# Phase 40 — Farm Resource Allocation & Budget-Constrained Planning

## Delivered
- Adds `/resource-planning`, a browser-side planning worksheet for cash available, protected reserve, existing commitments and default labour rate.
- Lets a manager add proposed activities with priority, block/location, labour hours, materials/other costs, optional deadline and reason/evidence.
- Calculates estimated labour and total costs, then proposes whole activities in priority order while respecting the spendable planning ceiling. If an activity does not fit, it is marked for deferral/review rather than partially funded.
- Adds navigation from the dashboard and links to operations intelligence, corrective actions, inspections, cost intelligence, cash flow and workforce modules.

## Important limitations
- The worksheet is local UI state only; it does not persist plans to the API, change source records, reserve cash, approve purchases, or post financial transactions.
- Default example activities, cash values, reserve and labour rate are illustrative and must be replaced with verified figures.
- Priority is a simple explicit ordering (critical/high/medium/low), then deadline; this is not an agronomic risk model and does not automatically assess legal, safety or biological urgency.
- Estimates exclude tax, price variation, transport, overheads, productivity variation and contingency unless the manager includes them manually. Costs must be checked for double counting against other modules.
- A task that does not fit is deferred for review; the tool does not prove it is safe to defer. A manager must inspect the underlying issue and decide.
- The plan is not a quotation, accounting statement, approved budget or authority to spend.

## Verification status
- ZIP archive integrity and required file presence checked after packaging.
- No claim of successful Next.js build, API integration, database persistence or browser testing. Perform these tests in the target environment before operational use.
