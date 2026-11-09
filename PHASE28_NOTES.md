# ForestOS Phase 28 — Farm Command Centre & Daily Management Dashboard

## Delivered
- Owner-only read-only endpoint: `GET /api/command-centre/dashboard`.
- Dashboard page: `/command-centre`.
- Consolidates unresolved persisted alerts, overdue tasks, low-stock checks, failed workflow counts, active risk register, risk actions, planned maintenance, KPI update gaps, current-month recorded income/expenses, latest manually recorded cash snapshot, and upcoming planned/committed outflow/reserve/investment totals.
- Builds a rule-based daily action list with source links and severity tags.
- Home navigation link added.

## Important limitations
- This is a read-only management dashboard; it does not execute purchases, payments, stock adjustments, task assignments or source corrections.
- The command centre does not run alert refresh itself. Refreshing this dashboard reads persisted alerts and also creates some direct action suggestions from source records.
- Financial figures are from recorded finance transactions only and may be incomplete. The latest cash snapshot is manual, not a live bank balance. Planned/committed outflow totals include only plans whose status is `planned` or `committed` and category is outflow, investment or reserve; they are not proof of payment.
- Inventory and task lists are bounded to 10,000 records; risks/actions, maintenance, targets and cash plans are bounded. The page reports some coverage counts, but large installations need pagination/indexing and explicit truncation indicators.
- Overdue tasks, maintenance due dates, risk scores and KPI gaps are heuristic prompts; verify the underlying record before acting.
- No compile/build, live API, database, authentication/role or browser test was run during archive creation. Test in a disposable development environment before operational use.

## Suggested verification
1. Check owner-only access and 401/403 behavior.
2. Seed representative finance, cash, stock, tasks, risk, maintenance, KPI and alert records.
3. Confirm the dashboard totals match source records and the action list links to correct modules.
4. Test empty collections, date boundaries and large datasets.
5. Verify no source records are changed by reading the dashboard.
