# Phase 91 — Apiary Inspections and Honey Harvest Records

## Added API
All routes require JWT authentication and `X-Organization-Id`; membership and
organization status are re-verified server-side.

- `GET /api/apiary-operations/inspections` — list inspections, optionally by `hiveId`
- `POST /api/apiary-operations/inspections` — record an inspection
- `GET /api/apiary-operations/harvests` — list honey harvests, optionally by `hiveId`
- `POST /api/apiary-operations/harvests` — record a harvest
- `GET /api/apiary-operations/harvest-summary` — summarize recorded harvest quantities

## Data controls
- Inspection and harvest records include organizationId and createdBy.
- The API verifies the hive belongs to the selected organization before creating
  a linked inspection or harvest record.
- Read queries are organization-scoped.
- Harvest quantities must be non-negative; optional moisture percentage must be
  between 0 and 100.
- The summary aggregates recorded harvests only and does not claim to estimate
  unrecorded production or revenue.

## Required tests before production
1. API build and MongoDB integration tests.
2. No JWT / missing organization header / revoked membership are denied.
3. Organization A cannot list or create records against Organization B's hive.
4. Forged organizationId and createdBy in the request body are ignored.
5. Hive IDs reused across organizations do not cross-link inspection/harvest data.
6. Validation rejects negative quantities and moisture above 100%.
7. Review access roles for creation routes and add explicit role policy if needed.
8. Add update/delete workflows only with audit and authorization rules.

## Limitation
This phase adds dedicated apiary inspection and honey harvest records; it does
not retrofit every pre-existing generic inspection, timber harvest, inventory,
finance, or sales path. Do not treat the platform as fully tenant-isolated until
all related modules and linked records have been migrated and tested.
