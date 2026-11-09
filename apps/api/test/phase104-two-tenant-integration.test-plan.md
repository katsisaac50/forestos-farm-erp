# Phase 104 — Two-Tenant Integration Test Plan

## Concrete compatibility issue addressed
The membership schema defines a singular `role` field, while organization context resolution previously only read a `roles` array. That mismatch could produce an empty role list in the context and break authorization checks that depend on context roles. Context resolution now prefers a legacy `roles` array when present and otherwise normalizes the canonical `role` field into a one-element array.

## Test fixtures and scenarios
See `phase104-two-tenant-integration-matrix.json` for two organizations, active/suspended memberships, example records, and 10 runtime test scenarios.

## Required runtime implementation
The matrix is a test specification, not an executed integration suite. Before production:
1. Set up a disposable MongoDB instance.
2. Create the two organizations and memberships with real ObjectIds matching the schemas.
3. Invoke the actual Nest controllers/services with authenticated test requests.
4. Assert status codes and database state for each scenario.
5. Include read, create, update, delete, aggregation, report, export, and nested-reference paths.
6. Capture test results in CI.

## Limitations
- This phase does not introduce a test framework or MongoDB test service.
- The role normalization change has only been statically checked; API build and runtime tests were not run.
- The broader API still requires route-by-route tenant-isolation review.
