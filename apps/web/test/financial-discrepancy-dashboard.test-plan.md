# Financial Discrepancy Dashboard — Test Plan

1. Signed-out request displays a useful authentication error.
2. Owner can load the report; non-owner access is denied by the API.
3. Partial scan warning is visible and cannot be mistaken for a complete reconciliation.
4. Severity and business-line filters return only matching proposal rows.
5. Search matches proposal code, ID and finding messages.
6. Expand/collapse displays finding IDs and messages.
7. Empty report and empty-filter states render without errors.
8. UGX values display consistently, including zero and null values.
9. Narrow/mobile viewport remains usable with horizontally scrollable tables.
10. Refresh updates report timestamp and values.
11. Loading and API failure states are accessible and do not crash the page.
12. Confirm the page performs no POST/PATCH/DELETE requests.

This is a test plan; browser and build tests have not been executed by this packaging step.
