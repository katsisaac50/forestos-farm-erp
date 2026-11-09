# Phase 91 Apiary Operations Test Plan

- [ ] JWT required for all five routes.
- [ ] Missing organization selector is rejected.
- [ ] Active membership is required for selected organization.
- [ ] Inspection create rejects hive not in selected organization.
- [ ] Honey harvest create rejects hive not in selected organization.
- [ ] List endpoints only return selected organization's records.
- [ ] Forged organizationId/createdBy are ignored.
- [ ] Negative quantity is rejected.
- [ ] Moisture below 0 or above 100 is rejected.
- [ ] Harvest summary totals are isolated by organization.
- [ ] Same hiveId in two organizations never causes cross-tenant joins.

These are planned tests; they have not been executed.
