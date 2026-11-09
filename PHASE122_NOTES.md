# Phase 122 — Sales and Inventory Tenant Isolation Implementation

## Implemented in source
- Both controllers now require the existing `AuthGuard` and resolve an active organization membership using `OrganizationAccessService.resolveContext` and `X-Organization-Id`.
- List queries require an `OrganizationContext` and filter by the server-resolved `organizationId`.
- Creates use `organizationDocument`, which derives `organizationId` and `createdBy` from verified context and discards client-supplied ownership fields.
- Updates use `findOneAndUpdate` with an organization-scoped `_id` filter, remove client-supplied ownership fields, and return NotFound when no row belongs to the selected tenant.
- Sales order IDs and inventory item IDs now use tenant-scoped compound unique indexes instead of globally unique schema fields.
- Sales and Inventory modules are registered in `AppModule`.

## Critical migration guardrails
This is a source-level implementation, not a production deployment. Existing documents may not have `organizationId` or `createdBy`. Backfill existing sales and inventory records to the correct organization only after verifying ownership from reliable records. Do not assign all legacy records to one tenant by assumption. Back up data, rehearse migration on a copy, report ambiguous rows for manual resolution, then create the new compound unique indexes after checking duplicates within each organization. Existing global unique indexes on `orderId` and `itemId` may need a deliberate migration plan; schema declarations alone do not drop old MongoDB indexes.

## Verification limits
The phase contract suite checks source patterns only. It does not compile NestJS, connect to MongoDB, run migrations, or prove live authorization. Do not expose these endpoints to production traffic until dependencies are installed, the API builds, legacy records are backfilled, index migration is verified, and integration tests prove same-tenant access succeeds while cross-tenant list/read/update attempts fail. Also verify role-level permissions independently: this phase establishes authentication and membership scope, not a full role matrix.
