# ForestOS — Phase 1 Starter
Web dashboard + API foundation for Masulita Green Farms (eucalyptus + beekeeping).

## Stack
- Next.js + React + TypeScript web app
- NestJS + MongoDB API
- Docker Compose for local MongoDB

## Start
1. Install Node.js 20+ and Docker.
2. From the project root run `docker compose up -d mongo`.
3. API terminal:
   `cd apps/api && cp .env.example .env && npm install && npm run start:dev`
4. Web terminal:
   `cd apps/web && cp .env.local.example .env.local && npm install && npm run dev`
5. Open http://localhost:3000

API health: http://localhost:4000/api/health

## Included
- Dashboard
- Plantation block register (create/list)
- Hive register (create/list)
- MongoDB schemas and API validation
- Local database setup

## Safety
This is a development starter, not production-secured. Authentication, role permissions, offline sync, audit logs, automated backups, and secure deployment must be implemented and tested before entering sensitive data or exposing it to the internet. Verify all farm baseline figures in the field.


## Phase 2 modules
Additional pages and API modules are included:
- `/finance` — income and expense transactions
- `/sales` — customer orders and balances
- `/inventory` — stock levels and reorder alerts
- `/tasks` — work assignments, deadlines and costs

These modules are wired into the API module. This is still a development starter; authentication, role permissions, audit logs, backups and secure deployment must be completed before production use.


## Phase 3 modules
- `/insights` — server-calculated financial and operations summary
- `/field-logs` — field observations, risks, actions and follow-up dates
- `GET /api/dashboard/summary`
- `GET/POST/PATCH /api/field-logs`

Dashboard metrics are based on saved records. Sales order value is not added to finance income, to avoid double-counting. Cash balance is deliberately not reported until opening balances and transfers are reconciled. The field log stores a photo reference, not an uploaded image; actual photo upload and GPS capture are future work.


## Phase 4 — Mobile Field Operations & Offline Queue

New field-operations features:
- Phone-friendly field-log form with optional browser GPS capture.
- Field logs queue in browser local storage if the API cannot be reached; use **Sync queued entries** once connected.
- Connection status and count of queued local entries.
- Basic PWA manifest and service worker for caching the field-log app shell.
- GPS is sent using the backend's existing `gpsLatitude` and `gpsLongitude` fields.

### Important limitations
- Offline queue is stored in the browser on that device only. It is not encrypted, not shared between devices, and can be lost if browser data is cleared.
- Sync uses the existing API. A queued record is removed only after the API accepts it. If the server accepts a record but the response is lost, a retry may hit the unique `logId` constraint; check server records before manually re-entering it.
- The service worker caches a small app shell, not the whole app or API data. First load should happen while online.
- GPS requires the user's permission and normally HTTPS (localhost is allowed). Coordinates may be inaccurate under tree cover.
- Photo capture/upload and robust conflict-safe background sync are not implemented in this phase.
- This remains a development starter, not production-ready. Before live use, add authentication and role permissions, audit logging, encrypted storage where appropriate, validated backups/restore, rate limiting, secure hosting and tests.


## Phase 5 — Authentication & Accountability Foundation

### What is added
- JWT-based sign-in with an 8-hour token lifetime.
- Password hashes stored with bcryptjs (not plaintext).
- First-owner setup endpoint that requires `OWNER_SETUP_KEY` and refuses setup once any user exists.
- Owner-only endpoint for creating additional accounts, with `owner` or `field_worker` role labels.
- Global API authentication guard: all endpoints require a valid Bearer token except the health check and explicitly public sign-in/setup endpoints.
- `/login` page and API helper that attaches the stored token.
- `/api/auth/me` endpoint to check the current session.

### Required configuration before starting
1. Copy `apps/api/.env.example` to `apps/api/.env` (or set the same environment variables in your deployment).
2. Set `JWT_SECRET` to a long, randomly generated secret, different from `OWNER_SETUP_KEY`.
3. Set `OWNER_SETUP_KEY` to a separate strong one-time secret. Never commit either secret to Git or put them in the frontend environment.
4. Start the API and database. Use the one-time setup endpoint to create the first owner:
   `POST http://localhost:4000/api/auth/setup-owner`
   JSON body: `{"email":"your-email@example.com","password":"a-long-password-of-12-or-more-characters","setupKey":"YOUR_OWNER_SETUP_KEY"}`
5. Sign in at `http://localhost:3000/login`.
6. After the first owner is created, the setup endpoint refuses further setup attempts. Keep the setup key private and rotate/remove it from the running environment after setup.
7. The owner can create another account through `POST /api/auth/users` with a valid Bearer token and JSON such as `{"email":"worker@example.com","password":"a-different-long-password","role":"field_worker"}`.

### Important security boundary
This phase adds API authentication and account creation, but it is not a completed enterprise permission model. The `field_worker` role is currently a role label; endpoint-by-endpoint least-privilege rules, account recovery, refresh tokens, login throttling, email verification, full audit trails, CSRF considerations, secure cookie storage, backup/restore testing and deployment hardening still need implementation and review. The browser currently stores the short-lived access token in localStorage, which is convenient for this starter but has XSS exposure. Do not expose this starter publicly or store sensitive live farm records until the remaining controls are implemented and tested.

### Compatibility note
Authentication is enforced globally by the API guard. Existing frontend pages must be signed in to read/write API-backed data. The public `/api/health` route remains available. This project has not been compiled or security-tested in this environment; run `npm install` and `npm run build` in both apps and fix any issues before use.


## Phase 6 — Inspection Scheduling & Worker Accountability

### Added
- New authenticated `/api/inspections` API and `/inspections` screen.
- Owner can schedule inspections with ID, workstream, site/block, title, due date, assigned worker email, priority and checklist.
- Worker list is restricted to inspections assigned to the signed-in account email.
- Workers can start/complete their own assigned inspections and record findings/corrective actions; owners can update inspections.
- Overdue status is calculated when listing records if the due date has passed and the inspection is not completed.
- Inspection list sorted by due date; new navigation link added to dashboard.
- MongoDB index supports filtering assigned inspections by worker and due date.

### Use
1. Sign in with an owner account.
2. Open `http://localhost:3000/inspections`.
3. Schedule an inspection and assign it to the worker's exact login email.
4. Worker signs in and sees inspections assigned to their account.
5. Worker uses Start or Complete and records findings and corrective action.

### Limits / safety
- This phase has not been built, runtime-tested or security-tested in this environment.
- Overdue status is computed on list requests; there is no scheduled background alert or email/SMS notification yet.
- Photo upload, recurring inspection templates, reminders, and a complete immutable audit log are not implemented.
- Other pre-existing API modules may still need endpoint-by-endpoint least-privilege authorization; do not assume every module is safe for field-worker access merely because authentication is enabled.
- Test owner and worker accounts, unauthorized access, validation, duplicate IDs, and deployment configuration before live use.


## Phase 7 — Evidence, Operational Alerts & Audit Trail

### Added
- Photo evidence endpoint (`POST /api/evidence`) for JPEG, PNG and WebP images; browser compresses/resizes images before upload.
- Evidence records link to inspection IDs and site/block names, with uploader and captured timestamp.
- Authenticated image retrieval endpoint; owner can see all evidence metadata, field workers see their own uploads.
- Inspection screen shows counts for overdue inspections, open high/critical priorities, inspections due within seven days and evidence records.
- Owner-only audit trail at `/audit`, with events recorded for inspection creation/updates and evidence uploads.
- Request body parser raised to 5 MB to support bounded image payloads.
- Audit events and evidence records are stored in MongoDB.

### How to use
1. Sign in, then open `/inspections`.
2. Use the photo input on an inspection row to select/take a photo.
3. Review recent evidence on the inspection screen.
4. As owner, open `/audit` to review supported changes.

### Important limitations
- This phase has not been compiled, runtime-tested or security-tested in this environment.
- Photos are stored as base64 in MongoDB for this starter. For production, use private object storage, file scanning, strict upload limits, retention policies and backups.
- Browser `capture="environment"` is a hint; actual camera behaviour depends on the device/browser.
- Alerts are dashboard counts only. No email, SMS, push or background scheduler is configured.
- Audit logging covers inspection create/update and evidence upload only. It is not immutable/tamper-proof and does not yet record every module's changes.
- Worker evidence visibility is restricted to their own uploads; evidence is not yet verified against assignment to a specific inspection.
- Ensure API response size and database storage are monitored. Do not expose publicly until full permission review, security testing, backups/restore, rate limiting and secure deployment are completed.


## Phase 8 — Executive Intelligence Dashboard

### Added
- New owner-only endpoint `GET /api/dashboard/summary` is now wired into the application.
- New `/executive` page consolidates recorded finance, sales outstanding, open/overdue tasks, inspections, evidence count and high/critical open inspections.
- Monthly recorded income/expense/net trend based on transaction dates.
- Business-line performance summary.
- Attention list combining overdue inspections, high/critical open inspections and overdue tasks.
- Data-quality warnings explicitly distinguish recorded operating net from verified cash balance.

### Access
Sign in as an owner and open `http://localhost:3000/executive`. The API route is restricted to owner role because it contains financial and operational summaries.

### Important limitations
- This phase has not been compiled, runtime-tested or security-tested in this environment.
- Dashboard figures summarize saved records only; missing or duplicate records can distort results.
- Sales order outstanding is calculated separately from recorded finance income to avoid double-counting.
- Recorded operating net is not a bank balance or audited profit. Transfers and opening balances require reconciliation.
- Eucalyptus tree counts, survival rates, harvest estimates, honey yield and GPS block areas are not inferred; enter verified data in their relevant modules.
- Existing non-dashboard modules still require endpoint-by-endpoint permission review before worker accounts are used with live data.


## Phase 9 — Plantation Intelligence & Growth Monitoring

### Added
- Owner-only `/plantation-intelligence` page and `GET /api/plantations/intelligence` endpoint.
- Per-block calculated survival percentage when initial tree count is non-zero and latest live-tree count is recorded.
- Recorded tree-loss count, missing-count indicators, area totals and growth sample summary.
- New growth-sample model and API (`GET /api/growth`, `GET /api/growth/trend?blockId=E-01`, owner-only `POST /api/growth`).
- `/growth` form for dated sample measurements: sample code, trees sampled, average height and average diameter at breast height (DBH).
- Plantation creation/update audit events when called through the application.
- New navigation links to Plantation Intelligence and Growth Samples.

### Suggested workflow
1. Confirm each block's block ID, measured area and planting date.
2. Record the original planting/tree count if documented.
3. Conduct a dated live-tree count using a consistent method and update the block register.
4. Take growth samples using the same sampling design on each visit; record which sample area/tree cohort was measured in the notes.
5. Review `/plantation-intelligence` to spot missing records and compare dated sample records over time.

### Important limits
- This phase has not been compiled, runtime-tested or security-tested in this environment.
- Survival is calculated only from entered initial and latest live tree counts. It is not automatically surveyed or verified.
- Growth sample averages do not estimate timber volume, harvest readiness or revenue. Those require validated forestry methods, representative sampling and current buyer specifications.
- The initial count may represent planting quantity rather than surviving trees at a formally defined baseline; record that distinction in notes.
- Plantation read access is still available to authenticated users in the existing register; intelligence, creation and update routes are owner-restricted. Review permissions for all modules before field-worker production use.


## Phase 10 — Harvest Planning & Timber Economics

Added owner-only harvest planning endpoints and `/harvest-planning` page:
- Harvest plans tied to plantation block IDs, proposed dates, workflow status, readiness notes, product specifications and replanting notes.
- Optional user-entered expected volume with a required unit and source/method. ForestOS does **not** estimate timber volume from height/DBH.
- Timber buyer quote register including buyer/contact, product specification, unit price in UGX, quote date/expiry, transport inclusion and payment terms.
- Itemized planning costs linked to a harvest plan: labour, processing, loading, transport, permits/fees, equipment, replanting and other.
- Scenario endpoint `GET /api/harvest/scenario/:planId?quoteId=<quoteId>` calculates gross proceeds only when volume is entered and its unit matches the quote unit; estimated margin subtracts recorded planning costs.
- Audit entries for harvest plans, buyer quotes and planning costs.

### API routes
- `GET/POST /api/harvest/plans`
- `PATCH /api/harvest/plans/:id`
- `GET/POST /api/harvest/quotes`
- `GET /api/harvest/costs?planId=<id>` and `POST /api/harvest/costs`
- `GET /api/harvest/scenario/:planId?quoteId=<id>`

### Interpretation and safety
- Scenario results are arithmetic using user-entered data, not a price forecast, valuation or guarantee of sale.
- Confirm buyer specifications, quote validity, actual measurement method, product quality, transport, taxes, permissions and applicable Ugandan forestry/environmental requirements before harvesting.
- “Ready” is an internal workflow status and is not legal or forestry approval.
- Planning costs are not posted automatically to the finance ledger. Reconcile actual payments separately to avoid double counting.
- Replanting notes are planning reminders, not a validated silvicultural prescription.
- Owner-only access is enforced through the existing roles guard, but the application has not received a full endpoint-by-endpoint authorization review.

### Setup and test status
Use the existing Phase 1 setup steps above. This phase extends the full Phase 9 source. The code has **not** been compiled, runtime-tested, security-tested or deployed in this environment; run `npm install` and `npm run build` in both apps and resolve any issues before using it with real records. Do not expose the development deployment publicly or enter sensitive data until security hardening and backups are in place.


## Phase 11 — Replanting & Forest Regeneration

Added owner-only `/regeneration` workspace and API:
- Regeneration plans linked to plantation block IDs: replanting, coppice-regrowth assessment, mixed review, restoration or other.
- Target dates, target area, seedling target, nursery stock, species/clone notes, site preparation, fire and grazing protection, and method rationale.
- Itemized regeneration costs in UGX, separate from finance ledger transactions.
- Survival checks with sample size, live count, dead/missing count, repeatable sampling-method notes and replacement action.
- Dashboard summary calculates sampled survival as `liveCount / sampleSize`, reports stock gaps when both target and available stock are entered, and aggregates recorded regeneration costs.
- Audit entries for plan creation/update, cost records and survival checks.

### API routes
- `GET /api/regeneration/dashboard`
- `GET/POST /api/regeneration/plans`
- `PATCH /api/regeneration/plans/:id`
- `GET/POST /api/regeneration/costs?planId=<id>`
- `GET/POST /api/regeneration/survival-checks?planId=<id>`

### Interpretation and safety
- Survival percentage describes the recorded sample only, not the whole plantation.
- Sampling should use a consistent, documented method. Counts are validated so live + dead/missing equals sample size.
- Regeneration method depends on site condition, species/clone, stump condition, intended product and local forestry guidance; the app does not prescribe a universal method.
- “Approved internally” is not a legal or forestry permit.
- Cost records are not automatically posted to the finance ledger. Reconcile actual payments separately.
- Nursery stock figures are user-entered and are not linked to a live nursery inventory module.
- Existing API modules have not received a full endpoint-by-endpoint authorization review.

### Setup and test status
Use the existing setup instructions above. This ZIP extends the complete Phase 10 project. It has **not** been compiled, runtime-tested, security-tested or deployed in this environment. Run `npm install` and `npm run build` in both apps and resolve issues before using real records. Secure deployment, backups, monitoring and authorization review remain required before production use.


## Phase 12 — Nursery & Seedling Inventory

Added owner-only `/nursery` workspace and API:
- Nursery batch register with unique batch code, species/clone, propagation type, start date, initial quantity, optional unit cost and expected ready date.
- Stock movement ledger for additional production, losses/mortality, dispatch to a plantation block and controlled stock adjustments.
- Stock validation rejects negative quantities and requires a destination block for dispatch.
- Dashboard summary for recorded stock, recorded dispatches/losses, batch count and estimated stock value where unit costs are provided.
- Audit events for batch creation and stock movements.
- Current inventory and recent movement tables.

### API routes
- `GET /api/nursery/dashboard`
- `GET/POST /api/nursery/batches`
- `GET/POST /api/nursery/movements?batchId=<id>`

### Interpretation and safety
- Stock is based on recorded movements and must be reconciled with physical counts.
- Estimated stock value uses user-entered unit cost and is not a formal accounting valuation.
- A dispatch is not proof of seedling survival or successful establishment in the field.
- Dispatches are not automatically connected to regeneration records or finance transactions.
- The app does not verify the identity or quality of a species/clone; retain supplier documentation.
- Concurrency, full inventory controls and endpoint-by-endpoint authorization still require testing and review.

### Setup and test status
Use the existing setup instructions above. This ZIP extends the complete Phase 11 project. It has **not** been compiled, runtime-tested, security-tested or deployed in this environment. Run `npm install` and `npm run build` in both apps and resolve issues before using real records. Secure deployment, backups, monitoring and authorization review remain required before production use.


## Phase 13 — Workforce & Labour Productivity

Added owner-only `/workforce` workspace and API:
- Worker register with worker code, display name, worker type, status, optional contact details, optional daily rate and skills/notes.
- Work assignments with task code, activity, optional plantation block and assigned worker, planned date, priority, target quantity/unit and instructions.
- Labour entries recording worker, task, date, hours, output quantity/unit, recorded labour cost and notes.
- Task status workflow: assigned, in progress, submitted, verified, rejected and cancelled.
- Dashboard aggregates task hours, output and labour cost, and calculates cost per output unit only when recorded output units are consistent for a task.
- Audit entries for worker creation, task creation/update and labour entries.

### API routes
- `GET /api/workforce/dashboard`
- `GET/POST /api/workforce/workers`
- `GET/POST /api/workforce/tasks`
- `PATCH /api/workforce/tasks/:id`
- `GET/POST /api/workforce/entries?taskId=<id>`

### Interpretation and safety
- Productivity comparisons should use comparable activities, units, quality standards, terrain, weather and conditions.
- Cost per output unit includes only the recorded labour cost; it is not a full cost of production.
- Labour entries are not automatically posted to the finance ledger.
- Worker data may contain personal information; restrict access and collect only necessary information.
- This starter does not provide worker self-service logins, payroll compliance, timesheet approvals by a separate supervisor role or geofenced attendance.
- Endpoint-by-endpoint authorization review and secure deployment are still required.

### Setup and test status
Use the existing setup instructions above. This ZIP extends the complete Phase 12 project. It has **not** been compiled, runtime-tested, security-tested or deployed in this environment. Run `npm install` and `npm run build` in both apps and resolve issues before using real records. Secure deployment, backups, monitoring and authorization review remain required before production use.


## Phase 14 — Farm operations & cost intelligence
- `/cost-intelligence` — owner-only budget plans, cost allocations, budget-versus-recorded-allocation variances, and unassigned cost visibility.
- API routes: `GET /api/cost-intelligence/dashboard`, `GET/POST /api/cost-intelligence/plans`, and `GET/POST /api/cost-intelligence/allocations`.
- Budget amounts and cost allocations are explicitly entered by the owner. The app does not infer costs or forecast values.
- This is a separate management allocation register. It does not post to the finance ledger or automatically import finance, workforce, nursery, regeneration, or harvest records. Avoid double-counting the same underlying cost.
- A non-manual source type requires a source reference and duplicate sourceModule/sourceReference pairs are blocked; references are manually entered and are not proof that the source record exists.
- Variance is budget minus linked allocations. Negative variance means linked recorded allocations exceed budget. Unassigned costs do not affect plan variance.
- This phase has not been compiled, runtime-tested, or security-tested. Validate dependencies, TypeScript types, authorization, data integrity, backups, and deployment configuration before using with real farm records.


## Phase 15 — Cash flow & capital allocation
- `/cashflow` — manually reconciled cash snapshots, planned inflows/outflows/reserves/investments, and capital allocation decision worksheets.
- API: `GET /api/cashflow/dashboard`, `GET/POST /api/cashflow/positions`, `GET/POST /api/cashflow/plans`, and `GET/POST /api/cashflow/decisions`.
- A cash snapshot is manually entered and does not automatically reconcile bank accounts, finance transactions, pending payments or prior snapshots. The dashboard is not a live cash balance.
- Planned movement is a sum of manually entered active/planned records and is not a verified forecast. Marking a plan completed removes it from the planned movement summary; it does not post a finance transaction.
- Capital decision worksheet calculates investable cash at entry as cash entered minus reserve minus other commitments, floored at zero. It does not reserve money, authorize payment, or guarantee that cash is still available. Decisions are saved as draft unless a status is explicitly provided.
- Do not count projected timber proceeds, honey sales or other future revenue as available cash before receipt. Avoid duplicate recording between Finance, Cost Intelligence and this planning module.
- This phase has not been compiled, runtime-tested, or security-tested. Validate TypeScript, permissions, data integrity, backups, reconciliation procedures and deployment before real use.


## Phase 16 — Strategic investment analysis
- `/investment` — owner-only scenario register, annual cash-flow model, NPV, simple payback year, discounted benefit-cost ratio, and review decision log.
- API: `GET /api/investment/dashboard`, `GET/POST /api/investment/scenarios`, `PATCH /api/investment/scenarios/:id/status`, and `POST /api/investment/decisions`.
- Scenarios use manually entered year-1 revenue and annual operating costs, constant growth assumptions, a discount rate, initial investment contingency, and optional residual value in the final year.
- The calculation is a simplified annual pre-tax nominal model. It does not automatically include inflation, taxes, VAT, financing, working capital, irregular harvest timing, production cycles, asset replacement, or uncertain cash flow timing. Do not treat outputs as forecasts or guaranteed returns.
- NPV uses end-of-year annual net cash flows and discounts them by the user-entered rate. Payback is the first whole year cumulative undiscounted cash flow becomes non-negative; it is not fractional-year payback.
- Review decisions are recorded as a separate audit trail; changing scenario status to approved is a manual status action, not a payment authorization or proof of independent review.
- This phase has not been compiled, runtime-tested, or security-tested. Validate the model with an independent spreadsheet and farm-specific evidence before using it to allocate real capital.


## Phase 17 — Risk Management & Decision Intelligence
Owner-only risk register and mitigation workflow at `/risk-management`.
- Record farm risks by category and business line, with likelihood and impact ratings from 1–5.
- Calculate inherent scores (likelihood × impact), qualitative bands, and optional residual ratings after controls.
- Assign mitigation actions with owners, due dates, statuses and notes.
- Dashboard highlights critical/high risks, overdue action dates and overdue reviews.
- API endpoints: `/api/risk-management/dashboard`, `/api/risk-management/risks`, `/api/risk-management/actions` and PATCH endpoints for individual risk/action records.
- Scores are qualitative prioritisation aids, not actuarial predictions. No automatic hazard detection, email/SMS notifications, legal compliance verification, or insurance advice is included.


## Phase 18 — Maintenance & Asset Management
Owner-only workspace at `/maintenance`.
- Register assets, types, location, assignment, purchase information, service dates and service interval.
- Schedule preventive maintenance, inspections and repairs; record completion, labour, parts and other costs.
- Completed maintenance updates the asset's last-service date and calculates the next service date when an interval is configured.
- Register spare parts, stock levels, reorder thresholds, unit costs and adjust quantities.
- Dashboard shows assets needing repair, overdue scheduled jobs, overdue asset service dates, low-stock parts and recorded completed-maintenance costs.
- API routes: `/api/maintenance/dashboard`, `/api/maintenance/assets`, `/api/maintenance/records`, `/api/maintenance/parts`, plus PATCH routes for individual assets, records and parts.
- Limits: no automatic spare-part deduction, finance-ledger posting, purchase orders, depreciation accounting, notifications, or external supplier integrations. Validate all data and test before operational deployment.


## Phase 19 — Procurement & Supplier Management
Owner-only workspace at `/procurement`.
- Supplier register with contacts, categories, payment terms, status and management rating.
- Purchase requisitions with requester, needed-by date, business line, justification and estimated cost; owner can update status.
- Purchase orders with supplier, dates, line items, unit prices, transport and other costs.
- Goods receipts linked to order lines, with received quantity and condition notes. Receipt quantities are checked against outstanding ordered quantities.
- Dashboard tracks active suppliers, pending requests, open/overdue orders, receipts and total non-cancelled order commitments.
- API routes under `/api/procurement`: `dashboard`, `suppliers`, `requests`, `orders`, `receipts`, plus PATCH routes for supplier/request/order records.
- Limits: this module does not transmit orders to suppliers, enforce multi-user approval separation, post transactions to finance, or automatically update spare-part/nursery inventories. Order values are not a substitute for accounting records.


## Phase 20 — Integrated Inventory & Stock Control
Owner-only workspace at `/inventory-control`.
- Central stock item register for seedlings, spare parts, fuel, tools, beekeeping supplies, safety materials and other stock.
- Opening balance and movement ledger for receipts, issues, returns, increases, decreases and write-offs.
- Validates that stock cannot fall below zero and calculates balance after each movement.
- Tracks reorder levels, low-stock alerts and indicative average-cost stock value.
- API routes under `/api/inventory-control`: `dashboard`, `items`, `movements`, plus PATCH for item metadata.
- Limits: procurement receipts, maintenance spare parts and nursery stock are not automatically synchronised; no atomic database transaction across stock and movement documents; no finance posting or formal accounting valuation. Reconcile stock physically and test before operational use.


## Phase 21 — Integration & Automated Workflow Foundation

Added an owner-only Integration & Workflow Center at `/integration-workflows` and API routes:
- `GET /api/integration-workflows/dashboard`
- `GET /api/integration-workflows/events?status=pending`
- `POST /api/integration-workflows/events`
- `POST /api/integration-workflows/events/:id/process`
- `POST /api/integration-workflows/events/:id/cancel`

The queue supports controlled stock movements associated with procurement receipts, maintenance parts issues, nursery receipts/dispatches, and manual adjustments. Event codes are reused as stock movement codes, and retries look for an existing movement before posting again. A workflow event must be explicitly reviewed and processed by an owner.

**Scope and safety limits:** this phase does not automatically subscribe to or synchronize records from procurement, maintenance, nursery, or finance. Users must verify the originating source record and create the workflow event manually. It updates the central inventory movement ledger only; it does not create finance transactions or update the source module. MongoDB writes across workflow and inventory documents are not atomic transactions, so inspect failed events and stock balances before retrying. Concurrent duplicate requests are guarded by a status claim, but this starter implementation has not been concurrency or runtime tested.


## Phase 22 — Automated Reporting & Management Intelligence

Added the owner-only `/management-intelligence` report page and `GET /api/management-intelligence/dashboard`. The report consolidates current recorded finance transactions, labour tasks, stock levels and estimated stock value, integration workflow status, inspections, and farm risks. It highlights low-stock items, failed/pending workflows, overdue tasks/inspections, and high residual risks.

The report is rules-based and refreshes when opened or when the user clicks Refresh. It does not yet run scheduled reports or send email/SMS alerts. It is not an audited financial statement, live cash report, or proof that no other operational problems exist. Values depend on the records available in each module, and the API currently loads bounded recent record sets for performance.


## Phase 23 — Data Quality, Reconciliation & Integrity Controls

Added the owner-only `/data-integrity` page and `GET /api/data-integrity/report`. The read-only scan flags potential issues including invalid finance amounts/directions, unreconciled finance transactions, duplicate identifiers, invalid stock quantities/costs, duplicate movement codes, movements referencing missing items, possible item balance mismatches, processed workflows without matching stock movements, failed workflows, incomplete inspections/tasks, and risk scores outside the expected range.

The scan does not alter records or automatically repair discrepancies. Review the source documents and physical stock before making corrections. Results are based on bounded record sets and are not an audited reconciliation.


## Phase 24 — Backup, Recovery & Business Continuity

Added the owner-only `/backup-continuity` register for recording completed backups, verification outcomes, retention dates, and recovery drills. API routes are under `/api/backup-continuity`. Added optional operator-run `scripts/backup-mongodb.sh` and `scripts/restore-mongodb.sh` examples using MongoDB Database Tools.

The web page is a metadata register; it does not execute backups. The shell scripts require MongoDB tools and operator configuration. The backup script does not encrypt or upload archives off-site. The restore script uses `--drop`, requires an explicit confirmation environment variable, and must only be pointed at a disposable isolated test database. MongoDB data and uploaded evidence/files require separate backup plans. Read `scripts/README_BACKUP.md` before use.


## Phase 25 — Performance, Targets & Strategic Execution

Added the owner-only `/performance-strategy` page and `/api/performance-strategy` endpoints for creating measurable targets, recording actual updates, tracking history, and viewing calculated progress/status. Target updates are manual; this phase does not automatically import actuals from plantation, finance, workforce, nursery, or apiary modules. Define consistent evidence and measurement methods before relying on comparisons.


## Phase 26 — Automated KPI integration
See `PHASE26_NOTES.md`. The owner-only page `/performance-intelligence` offers read-only suggestions from finance, inventory, workforce and workflow records, with explicit confirmation before creating a KPI update.


## Phase 27 — Alerts & escalation
See `PHASE27_NOTES.md`. Owner-only refresh-driven alert evaluation and persisted acknowledgement/resolution states are available at `/alert-center`. It does not send external notifications or run in the background.


## Phase 28 — Farm command centre
See `PHASE28_NOTES.md`. The owner-only read-only daily dashboard is at `/command-centre` and consolidates key operational signals into a prioritised action list.


## Phase 29 — SOPs and work verification
See `PHASE29_NOTES.md`. The owner workspace is `/sops`; it includes default forestry, beekeeping and general farm SOP templates, scheduled checklist runs, evidence references and supervisor verification.


## Phase 30 — Worker Field Work

Open `/field-work` for assigned checklists and local drafts. `/api/sops/my-runs` returns runs assigned to the current login identifier. Drafts use unencrypted browser local storage and require manual sync. Read `PHASE30_NOTES.md` for limitations; this phase was not compiled or integration-tested.


## Phase 31 — GPS Field Verification

Use `/field-verification` to submit GPS metadata and an existing evidence reference for owner review. This phase does not upload photos or prove a worker's location. See `PHASE31_NOTES.md`; no build or integration tests were performed.


## Phase 32 — Photo Evidence

Open `/photo-evidence` to compress and upload field photographs for review. Files default to a private server-side directory; configure persistent private storage before production. See `PHASE32_NOTES.md`. This phase was not compiled or integration-tested.

## Phase 33 — Farm Mapping & Geospatial Intelligence

See `PHASE33_NOTES.md`. Includes `/farm-map` with farm-block polygons and point features for hive, inspection and access locations. Geometry and acreage are operational records, not surveyed/legal evidence.

## Phase 34 — Farm Mapping Integration & Field Navigation

See `PHASE34_NOTES.md`. Connects saved farm map features to explicit field navigation targets and external map links.

## Phase 35 — Field Inspection & Location Integration

See `PHASE35_NOTES.md`. Adds location-linked field inspection assignment, submission and owner review.

## Phase 36 — Inspection Analytics & Corrective Action Tracking

See `PHASE36_NOTES.md`. Adds due-date-driven corrective action tracking, worker updates, owner review and summary analytics.


## Phase 37 — Inspection-to-Corrective-Action Workflow
- Create a linked corrective action from an eligible submitted, verified, or rejected field inspection.
- Copies findings, recommended work, and location metadata; includes an unresolved-action duplicate guard.
- API: `POST /api/corrective-actions/from-inspection/:inspectionId`.
- See `PHASE37_NOTES.md` for behavior, example payload and limitations.
## Phase 38 — Worker Performance & Accountability Intelligence
Open `/worker-accountability` to review recorded corrective actions, inspection outcomes, and available workforce totals. This page is a read-only management view; see `PHASE38_NOTES.md` for access and interpretation limitations.


## Phase 39 — Farm Operations Intelligence
See `PHASE39_NOTES.md`. The `/operations-intelligence` page provides a rule-based, read-oriented queue for open corrective actions and block-level workload signals. Verify all source data and field conditions before acting.


## Phase 40 — Farm Resource Allocation & Budget-Constrained Planning
- `/resource-planning` — local planning worksheet for spendable ceiling, reserve, commitments, estimated labour/materials costs and priority-ordered activity proposals.
- This is a planning aid only: it does not persist plans, reserve cash, authorise spending or post transactions. See `PHASE40_NOTES.md` for limitations and verification status.


## Phase 41 — Budget Execution & Actual-versus-Planned Cost Tracking
- `/budget-execution` — local register for planned/actual labour and materials costs, status, due dates, variance analysis and CSV export.
- The worksheet is not connected to the API or official finance ledger and resets on refresh. See `PHASE41_NOTES.md` for limitations and verification status.


## Phase 42 — Financial Control & Reinvestment Intelligence
- `/reinvestment-intelligence` — local worksheet for income, expenses, reserves, commitments and planned reinvestment with CSV export.
- Cash estimates are not reconciled accounting figures; the worksheet does not persist to the API or post transactions. See `PHASE42_NOTES.md`.


## Phase 43 — Financial Intelligence & Monthly Reporting
- `/monthly-financial-report` — local monthly register and summary for recorded/planned income, expenses, reinvestment, reserves and commitments, with CSV export.
- This is not connected to the API or official ledger; see `PHASE43_NOTES.md`.


## Phase 44 — Persistent monthly financial reporting

See `PHASE44_NOTES.md`. The owner-only monthly report reads saved finance ledger transactions through `GET /api/financial-reports/monthly?month=YYYY-MM`; it does not create a second ledger. The report is a management summary and is not audited accounting or bank reconciliation.


## Phase 45 — Financial audit trail and transaction governance

See `PHASE45_NOTES.md`. Finance API reads and writes are owner-only; create/update operations write before/after audit snapshots using the existing audit module. Audit and ledger writes are not atomic, and this is not tamper-proof logging.


## Phase 46 — Financial reconciliation and cash control

See `PHASE46_NOTES.md`. This is a manual account/month snapshot register with a simple balance formula, difference flag and owner review marker; it does not match individual statement lines to individual transactions.


## Phase 47 — Statement import and transaction matching

See `PHASE47_NOTES.md`. CSV statement rows are stored separately from the finance ledger; exact-match suggestions require explicit owner confirmation and do not post transactions.


## Phase 48 — Financial exception reporting

See `PHASE48_NOTES.md` for limitations and controls.


## Phase 49 — Financial investigations

See `PHASE49_NOTES.md` for workflow, safeguards and limitations.


## Phase 50 — Financial governance scorecard
See `PHASE50_NOTES.md`. Owner-only monthly scorecard at `/financial-governance` and API `GET /api/financial-governance?month=YYYY-MM`.


## Phase 51 — Financial Governance Action Centre
See `PHASE51_NOTES.md`. Owner-only action workflow at `/financial-action-centre`.


## Phase 52 — Financial Evidence & Verification Register
See `PHASE52_NOTES.md`. Owner-only evidence reference and review workflow at `/financial-evidence`.


## Phase 53 — Integrated Financial Audit Trail
See `PHASE53_NOTES.md`. Owner-only consolidated audit timeline at `/financial-audit-trail`.


## Phase 54 — Financial Control Escalation Centre
See `PHASE54_NOTES.md`. Owner-only, request-triggered escalation queue at `/financial-escalations`.


## Phase 55 — Financial Control Management Report
See `PHASE55_NOTES.md`. Owner-only monthly report at `/financial-control-report`.


## Phase 56 — Financial Control Performance & Risk Reduction
- Owner-only endpoint: `GET /api/financial-control-performance?month=YYYY-MM&compareTo=YYYY-MM`.
- UI: `/financial-control-performance`.
- Ranks unresolved escalations with a transparent severity/age/overdue heuristic; reports average resolution time where timestamps exist; identifies repeated source/reason labels; compares a small set of starter targets.
- Targets are defaults for management discussion, not validated industry benchmarks. Risk score is not a monetary loss estimate or proof of control effectiveness.
- Reads existing records only; does not refresh/create escalations or send notifications. Queries are capped at 1,000 records per source.


## Phase 57 — Financial Governance & Reinvestment Decision Engine
- Owner-only endpoint: `GET /api/reinvestment-decision-engine`.
- UI: `/reinvestment-decision-engine`.
- Combines latest recorded cash snapshot, active cash-flow plans, approved/executed capital decisions and unresolved financial escalations.
- Returns a transparent preliminary hold/review/potential-reinvestment signal with reasons and calculation assumptions.
- This is decision support only: not live bank data, not payment approval, not an automatic transfer, and not a substitute for owner review. Planned inflows may not materialise. Verify records and reconcile cash before committing funds.


## Phase 58 — Farm Cash Protection & Capital Allocation
- Owner-only endpoint: `GET /api/capital-allocation`; `POST /api/capital-allocation/policy`; `POST /api/capital-allocation/proposals`; `PATCH /api/capital-allocation/proposals/:id/review`.
- UI: `/capital-allocation`.
- Stores minimum operating reserve and capital budget caps for eucalyptus, beekeeping, infrastructure and other projects. Proposals require an evidence reference and review note.
- Approval/execution checks for recorded cash, critical/overdue escalations, remaining line budget and indicative unallocated cash. The check is based on ForestOS records, not live bank data. It is not a payment workflow.


## Phase 59 — Capital Commitment & Spending Verification
- Owner-only endpoint: `GET /api/capital-spend-verification`, `POST /api/capital-spend-verification`, `PATCH /api/capital-spend-verification/:id/review`.
- UI: `/capital-spend-verification`.
- Links expenditure evidence references to approved/executed capital proposals; submitted spend remains pending until reviewed.
- Verified cumulative spend is blocked from exceeding the proposal's approved amount. This is a recordkeeping/evidence workflow, not a bank connection or payment system; evidence itself is referenced, not uploaded.


## Phase 60 — Monthly Financial Close & System Fine-Tuning
- Owner-only month-end checklist at `/monthly-financial-close`.
- Combines recorded reconciliation status, unresolved financial escalations, and capital-spend verification into a bounded source snapshot.
- Supports draft saving, reviewer sign-off, reasoned reopening, and audit events.
- See `docs/PHASE60_SYSTEM_AUDIT_AND_FINE_TUNING.md` for a source-level architecture/risk review and prioritised release gates.
- Financial values are manually entered or read from ForestOS records; no live bank integration or statutory-accounting certification is implied.
- ZIP integrity and required-file checks are performed for this archive. Full TypeScript builds, runtime integration tests, and security tests have not been performed.


## Phase 61 — Financial Validation & Reconciliation Accuracy
- Added DTO validation for monthly financial close save/review/reopen endpoints.
- Added reusable helpers for month, money, text, and business-date validation.
- Tightened checklist shape validation and whole-UGX input handling.
- Added a reconciliation accuracy specification and test plan.
- This does not yet retrofit every legacy financial endpoint or complete the full ledger-to-statement matching implementation.
- Archive integrity is checked; production build and runtime tests remain unverified.


## Phase 62 — Concurrency-Safe Capital Controls
- Added an atomic conditional increment for verified capital spend against a proposal's approved amount.
- Prevented re-review of spend records already verified or rejected through the same route.
- Added legacy counter initialisation, concurrency test plan, and documented transactional limitations.
- Full MongoDB transactions, reconciliation/repair automation, pending-proposal reservations, builds and runtime tests remain outstanding.


## Phase 63 — Financial Evidence Integrity & Corrections
- Added evidence-reference change history and correction requests.
- Added a separate reversal-record workflow rather than silently overwriting verified expenditure.
- Documented counter consistency, net-spend reporting, DTO, transaction, upload-security and test requirements.
- The reversal scaffold is not a complete double-entry accounting solution; dashboard treatment and atomic multi-document operations remain follow-up work.


## Phase 64 — Closed-Period Integrity & Financial Record Versioning
- Added append-only monthly close version events and version history endpoint.
- Added SHA-256 fingerprints over bounded source records to detect selected changes after close.
- Flags closed periods for re-review when current source fingerprint differs from the close snapshot.
- Fingerprints are bounded and dashboard-triggered; not a complete immutable accounting ledger or background monitor.
- Build, runtime and database integration tests remain outstanding.


## Phase 65 — Automated Testing, Integration & Release Readiness
- CI workflow: `.github/workflows/release-readiness.yml`.
- Source-contract check: `node scripts/release-smoke-check.mjs`.
- Release test matrix and known limitations: `docs/PHASE65_RELEASE_READINESS.md`.
- A successful source check does not replace app builds, MongoDB integration tests or security review.


## Phase 66 — Financial Transaction Integrity & Reversal Reconciliation
- Integrity specification: `docs/PHASE66_FINANCIAL_TRANSACTION_INTEGRITY.md`.
- Regression test plan: `apps/api/test/financial-transaction-integrity.test-plan.md`.
- Readiness check: `node scripts/financial-integrity-readiness.mjs`.
- This phase does not modify live data or claim transactional correctness; integration implementation and tests remain required.


## Phase 67 — Automated Financial Reconciliation & Recovery
- Reconciliation contract and safe recovery workflow: `docs/PHASE67_AUTOMATED_FINANCIAL_RECONCILIATION_RECOVERY.md`.
- Database test plan: `apps/api/test/automated-financial-reconciliation.test-plan.md`.
- Documentation check: `node scripts/reconciliation-spec-check.mjs`.
- The actual MongoDB reconciliation endpoint and repair executor remain future implementation work.


## Phase 68 — Transactional Financial Controls
- Implementation blueprint: `docs/PHASE68_TRANSACTIONAL_FINANCIAL_CONTROLS.md`.
- Regression matrix: `apps/api/test/transactional-financial-controls.test-plan.md`.
- Specification check: `node scripts/transactional-controls-spec-check.mjs`.
- This phase does not claim a transaction service or database-backed reconciliation endpoint is implemented.


## Phase 69 — Read-only Financial Reconciliation API
- Endpoint: `GET /api/capital-spend-verification/reconciliation` (owner-only, read-only, bounded scan).
- Details and limits: `docs/PHASE69_READ_ONLY_RECONCILIATION_API.md`.
- Integration test plan: `apps/api/test/read-only-financial-reconciliation.test-plan.md`.
- This endpoint reports discrepancies; it does not repair records or establish transactional correctness.


## Phase 70 — Financial Reconciliation Dashboard
- Web route: `/financial-discrepancies`.
- Read-only dashboard and filtering details: `docs/PHASE70_FINANCIAL_DISCREPANCY_DASHBOARD.md`.
- UI test plan: `apps/web/test/financial-discrepancy-dashboard.test-plan.md`.
- No discrepancy resolution or repair action is performed by this page.


## Phase 71 — Financial Investigation Case Management
- Web route: `/financial-investigation-cases`.
- API and workflow details: `docs/PHASE71_FINANCIAL_INVESTIGATION_CASE_MANAGEMENT.md`.
- Test plan: `apps/api/test/financial-investigation-cases.test-plan.md`.


## Phase 72 — Evidence Integrity & Audit Verification
- Web route: `/case-evidence`.
- Scope and security limits: `docs/PHASE72_EVIDENCE_INTEGRITY_AUDIT_VERIFICATION.md`.
- Test plan: `apps/api/test/case-evidence.test-plan.md`.


## Phase 73 — Secure Evidence Upload & File Integrity
See `docs/PHASE73_SECURE_EVIDENCE_UPLOAD_FILE_INTEGRITY.md`. Configure `EVIDENCE_STORAGE_DIR` as a private durable volume before enabling evidence upload. Accepted formats: PDF, PNG, JPEG; 10 MiB maximum. Malware scanning and encryption-at-rest are not included.


## Phase 74 — Evidence Security Hardening & Operational Recovery
See `docs/PHASE74_EVIDENCE_SECURITY_HARDENING_OPERATIONAL_RECOVERY.md`. Start with a dry-run reconciliation. Apply mode quarantines missing/corrupt active records but never deletes orphan files.


## Phase 75 — Financial & Evidence Recovery Governance
See `docs/PHASE75_FINANCIAL_EVIDENCE_RECOVERY_GOVERNANCE.md`. Recovery incidents support assignment, deadlines, case/evidence references, recorded history, and independent approval for critical/high closure.


## Phase 76 — Recovery Monitoring & Management Alerts
See `docs/PHASE76_RECOVERY_MONITORING_MANAGEMENT_ALERTS.md`. The dashboard computes overdue, due-soon, critical/high, awaiting-approval and unassigned incident lists on request. Background scheduling and email/SMS delivery are not configured.


## Phase 77 — Recovery Reminders & Escalation Workflows
See `docs/PHASE77_RECOVERY_REMINDERS_ESCALATION_WORKFLOWS.md`. Manual evaluations write deduplicated internal reminder/escalation log entries. No scheduler or external notification provider is configured.

## Phase 78 — Scheduled Recovery Monitoring
See `docs/PHASE78_SCHEDULED_RECOVERY_MONITORING.md`. The API can run opt-in periodic recovery escalation evaluations using a MongoDB lease and exposes scheduler status. It logs internal events only; it does not send external notifications.


## Phase 79 — Notification Delivery & Reliability
See `docs/PHASE79_NOTIFICATION_DELIVERY_RELIABILITY.md`. Configure `RECOVERY_NOTIFICATION_WEBHOOK_URL` (and optionally `RECOVERY_NOTIFICATION_WEBHOOK_TOKEN`) on the API server to queue new escalation events for a trusted notification provider. The endpoint must return a 2xx response to mark an event accepted.

## Phase 80 — Notification Operations & Audit Governance

The recovery delivery dashboard (`/recovery-delivery`) now includes audit filters, delivery metrics, and CSV export of the currently displayed records. API details and verification checklist: `docs/PHASE80_NOTIFICATION_OPERATIONS_AUDIT_GOVERNANCE.md`.


## Phase 81: Notification provider health and controlled replay
See `docs/PHASE81_NOTIFICATION_SECURITY_PROVIDER_HEALTH_CONTROLLED_RECOVERY.md`. Dashboard: `/recovery-provider-health`.


## Phase 83 — Notification Policy Management

Open `/notification-policies` to create versioned owner-controlled notification policies and review the change audit. See `docs/PHASE83_NOTIFICATION_POLICY_MANAGEMENT_SCALABILITY_FOUNDATION.md`. Policies are configuration only in this phase; they do not yet alter scheduled evaluation.


## Phase 84 — Policy evaluation preview

Open `/notification-policies` and select **Preview policy matches**. The preview compares enabled policies with open recovery incidents and does not queue or send notifications. See `docs/PHASE84_POLICY_DRIVEN_ESCALATION_ENGINE.md`.


## Phase 85 — Organization Registry

Open `/organizations` to register organizations and manage administrative membership records. This is not yet production-ready tenant isolation; existing business collections are not all tenant-scoped. See `docs/PHASE85_MULTI_ORGANIZATION_FOUNDATION.md`.

## Phase 86 — Tenant Context and Scope Foundation

Phase 86 adds fail-closed organization-context primitives and safe organization
scope helpers for API modules to adopt. See
`docs/PHASE86_TENANT_CONTEXT_SCOPE_FOUNDATION.md` and
`apps/api/src/organizations/organization-context.test-plan.md`.

**Important:** this is a foundation only, not complete tenant isolation. Do not
onboard independent customer organizations until membership resolution,
tenant-scoping of every domain path, migration, and cross-tenant tests are
complete.

## Phase 87 — Tenant-Aware Authentication

Adds authenticated endpoints to list a user's active organizations and resolve
an organization context only after server-side membership verification. See
`docs/PHASE87_TENANT_AWARE_AUTHENTICATION.md`.

This is not yet complete tenant isolation: all domain endpoints must still apply
organization filters and cross-tenant security tests before customer onboarding.

## Phase 88 — Plantation Tenant Isolation

The plantation list, create, update, and intelligence endpoints now require a
verified organization selection and use organization-scoped database operations.
See `docs/PHASE88_PLANTATION_TENANT_ISOLATION.md` and
`apps/api/test/plantations-phase88.test-plan.md`.

Before using this with multiple independent organizations, migrate legacy data
carefully and test linked growth records, role enforcement, and all other modules.


## Phase 89 — Growth Tenant Isolation
Growth measurements and plantation intelligence are now scoped to verified organizations. See `docs/PHASE89_GROWTH_TENANT_ISOLATION.md`. Requires migrations, API build, integration tests, and broader module scoping before multi-customer deployment.

## Phase 90 — Apiary and Hive Tenant Isolation

Hive registry reads and writes now require verified organization membership
and use organization-scoped database filters. See
`docs/PHASE90_APIARY_TENANT_ISOLATION.md` and
`apps/api/test/hives-phase90.test-plan.md`.

Related inspection, harvest, inventory, finance, and reporting paths still need
their own tenant-scoping and integration tests before customer onboarding.

## Phase 91 — Apiary Inspections and Honey Harvests

Adds organization-scoped apiary inspection records, honey harvest records, and
a recorded-production summary. See
`docs/PHASE91_APIARY_INSPECTIONS_HONEY_HARVESTS.md` and
`apps/api/test/apiary-operations-phase91.test-plan.md`.

## Phase 92 — Apiary Production Intelligence

Adds organization-scoped apiary dashboard and productivity endpoints. The
insights use recorded hive, inspection, and honey-harvest data and include
explicit limitations. See `docs/PHASE92_APIARY_PRODUCTION_INTELLIGENCE.md`.


## Phase 98 — Evidence Governance & Audit Trail
See `docs/PHASE98_EVIDENCE_GOVERNANCE_AUDIT_TRAIL.md` for audit events, deletion, summary endpoint, and production limitations.


## Phase 99 — Evidence Reliability & Retention Foundations
See `docs/PHASE99_EVIDENCE_RELIABILITY_AND_RETENTION.md` for atomic manifest updates, quota guard, soft deletion, configuration, and limitations.


## Phase 100 — Production Readiness & Automated QA Foundations
Phase 100 adds a process-level readiness endpoint, documents private evidence storage/quota configuration, and defines release gates. See `docs/PHASE100_PRODUCTION_READINESS_QA.md`. The readiness endpoint does not test database connectivity; production release gates remain outstanding.


## Phase 101 — Tenant Isolation & Security Regression QA
Run `node scripts/tenant-isolation-smoke-check.js` for a narrow source-pattern smoke check. It is not a complete tenant-isolation audit. See `docs/PHASE101_TENANT_ISOLATION_QA.md`.


## Phase 102 — API Route Inventory & Security Audit Foundation
Run `node scripts/api-route-inventory.js` to regenerate a static route inventory and review-signal report. See `docs/PHASE102_API_ROUTE_INVENTORY.md` and `.json`. Heuristic signals are not confirmed vulnerabilities; runtime validation is required.


## Phase 103 — Continuous Security Regression Checks
Run `node scripts/phase103-security-regression.js` to run selected static security checks and validate the API route inventory. CI now invokes this check in the source-contract job. Passing it does not replace runtime authorization tests or production builds. See `docs/PHASE103_CONTINUOUS_SECURITY_REGRESSION.md`.


## Phase 104 — Tenant Membership Role Compatibility
Organization context resolution now normalizes the canonical singular membership `role` into `context.roles`, while remaining compatible with legacy `roles` arrays. Run `node scripts/phase104-membership-tenant-regression.js` for static regression checks. The two-tenant matrix is a runtime test specification, not an executed database suite.


## Phase 105 — Executable Multi-Tenant Test Foundation
Added `scripts/phase105-tenant-contract-tests.js`, a dependency-free regression runner for the tenant membership/schema contract, organization-scope helper, two-tenant test matrix, and release workflow. See `apps/api/test/PHASE105_EXECUTABLE_TEST_FOUNDATION.md`. These source-contract checks are not a substitute for live NestJS/MongoDB integration tests.


## Phase 106 — Live Multi-Tenant HTTP Test Harness
Added `scripts/phase106-live-tenant-http-tests.js` to execute configurable authenticated HTTP scenarios against a dedicated test API. Replace placeholder routes and fixture IDs before running. See `apps/api/test/PHASE106_LIVE_HTTP_TEST_HARNESS.md`. The runner is not a substitute for broad route-by-route coverage.


## Phase 107 — Automated Tenant Security Pipeline
Added `.github/workflows/tenant-security-regression.yml` to run tenant source-contract regressions on pull requests and main/master pushes, publish route inventory artifacts, and provide an opt-in live HTTP job. See `apps/api/test/PHASE107_AUTOMATED_SECURITY_PIPELINE.md`; the live scenarios remain opt-in and require real test fixtures.


## Phase 108 — Reproducible Test Data & Environment
Added `docker-compose.test.yml` and `scripts/phase108-seed-test-fixtures.js` to create isolated test data for two organizations, memberships, eucalyptus plantation blocks, and hives. See `apps/api/test/PHASE108_REPRODUCIBLE_TEST_ENVIRONMENT.md`. Live database seeding has not yet been executed in this build environment.


## Phase 109 — Fixture/schema alignment

Phase 109 aligns the Phase 108 suspended test user with the actual `User.role` enum and adds static schema/fixture contract checks. Run `node scripts/phase109-schema-alignment-contract-tests.js`. These checks do not replace live MongoDB, login, or API integration tests; see `PHASE109_NOTES.md`.


## Phase 110 — Live readiness probe

Phase 110 adds a non-mutating HTTP probe for API health, test-user login, and bearer identity. Configure a dedicated non-production test API and fixture credentials as described in `PHASE110_NOTES.md`. Static contract checks run in CI; live HTTP checks require an explicitly prepared environment and have not been run automatically.


## Phase 111 — Membership reference consistency

Phase 111 aligns organization membership queries with the schema's string reference fields and normalizes the canonical singular membership role when listing organizations. Run `node scripts/phase111-membership-reference-contract-tests.js`. Static checks do not replace a live MongoDB-backed integration test.


## Phase 112 — Model & Fixture Contract Audit

Run `node scripts/phase112-model-fixture-contract-tests.js` to check source-level alignment between registered organization schemas, membership reference types, fixture collection declarations, and the tenant-security workflow. This is a static audit, not a live database or API integration test. See `PHASE112_NOTES.md`.


## Phase 113 — MongoDB Runtime Preflight

`node scripts/phase113-mongodb-runtime-preflight.js` performs a read-only connection and required-collection check against a database whose name includes `test` or `qa`. It requires API dependencies and `FORESTOS_TEST_MONGODB_URI`. See `PHASE113_NOTES.md`; it does not prove tenant isolation.


## Phase 114 — Fixture Integrity Audit

`node scripts/phase114-fixture-integrity-audit.js` checks Phase 108 test fixtures in a dedicated test database without modifying records. See `PHASE114_NOTES.md` for setup and limitations.


## Phase 115 — Live Auth & Organization Membership Probe

See `PHASE115_NOTES.md`. Run `node scripts/phase115-auth-membership-contract-tests.js` for dependency-free static contract checks. Live HTTP checks require a dedicated non-production API and test credentials; no live API/database checks were run while packaging this phase.


## Phase 116 — Domain Route Tenant Enforcement Audit

See `PHASE116_NOTES.md`. Run `node scripts/phase116-tenant-route-audit.js` to generate a JSON inventory of API controller routes and organization-context references, then review the full service/query paths before asserting tenant isolation.

## Phase 117 — Service-Level Tenant Query Review Queue

See `PHASE117_NOTES.md`. Run `node scripts/phase117-service-tenant-query-audit.js` to create a prioritized static review queue for service query paths. Priority labels are triage signals only; they do not establish vulnerabilities or prove tenant isolation.


## Phase 118 — Route-to-Service Tenant Remediation Matrix

Run `node scripts/phase118-route-service-remediation-matrix.js` after the Phase 116 and Phase 117 audit scripts. It joins route-level and service-level static signals into `PHASE118_ROUTE_SERVICE_REMEDIATION_MATRIX.json`. The matrix is a review queue only: same-directory service candidates are not a confirmed call graph, and no production security certification is implied. See `PHASE118_NOTES.md` for manual closure criteria.


## Phase 119 — Plantation Read-Only Tenant Isolation Probe

Run `node scripts/phase119-plantation-tenant-contract-tests.js` for source contract checks. For a dedicated non-production API, configure the required tenant tokens, organization IDs, and unique seeded plantation markers, then run `node scripts/phase119-plantation-tenant-read-probe.js`. The probe uses GET requests only and tests two plantation endpoints; it is not a whole-application tenant-isolation certification. See `PHASE119_NOTES.md`.

## Phase 120 — Critical Domain Tenant Coverage Queue
Run `node scripts/phase120-critical-domain-tenant-coverage.js` to regenerate the static review queue for Sales, Inventory, Procurement, Finance, Workforce, Evidence, and Audit. Run `node scripts/phase120-critical-domain-tenant-contract-tests.js` for dependency-free contract checks. This is a prioritization aid, not a security finding or production certification. Review `PHASE120_NOTES.md` before interpreting the generated report.

## Phase 121 — Sales and Inventory Tenant Remediation Readiness
Run `node scripts/phase121-sales-inventory-remediation-readiness.js` to generate a direct-source remediation report and `node scripts/phase121-sales-inventory-contract-tests.js` for dependency-free checks. The current legacy Sales and Inventory paths show unscoped list/update patterns and schemas without a visible organizationId field. This phase documents safe remediation controls but does not claim a live exploit or apply a partial migration. See `PHASE121_NOTES.md`.


## Phase 122 — Sales and Inventory tenant isolation
See `PHASE122_NOTES.md`. Source changes add authenticated organization context, scoped reads/writes, server-derived ownership and tenant-scoped unique indexes. Legacy-data migration and live integration validation remain required before production rollout. Run `npm run test:phase122:contract` from `apps/api`.


## Phase 123 — Legacy Tenant Data Migration Audit
Run `npm run audit:phase123:legacy-tenant-data -- /secure/path/export.json` from `apps/api` to inspect a read-only JSON export before tenant backfill/index migration. The audit never writes to MongoDB; see `PHASE123_NOTES.md`. Contract checks: `npm run test:phase123:contract`.


## Phase 124 — Approved Tenant Migration Dry Run
A read-only planner validates explicit, evidence-backed ownership approvals for Sales and Inventory exports. It never writes to MongoDB and never infers ownership for uncovered records. See `PHASE124_NOTES.md`.


## Phase 125 — MongoDB Schema and Index Migration Readiness

See `PHASE125_NOTES.md`. Run `npm run audit:phase125:schema-index` and `npm run test:phase125:contract` from `apps/api`. This is a read-only static source audit; it does not connect to MongoDB or modify indexes.


## Phase 126 — Inventory Control Tenant Ownership

Run `npm run audit:phase126:inventory-tenant` and `npm run test:phase126:contract` from `apps/api`. The audit is static and read-only; it does not connect to MongoDB or change records. See `PHASE126_NOTES.md` and `PHASE126_INVENTORY_CONTROL_TENANT_OWNERSHIP_AUDIT.json` for findings and migration gates.


## Phase 127 — Inventory Control Tenant Isolation

Inventory Control now uses verified organization context and tenant-scoped queries. Run `npm run test:phase127:contract` from `apps/api`. Review `PHASE127_NOTES.md` before rollout: legacy data mapping and removal of the old global item-code index require an approved migration.


## Phase 128 — Inventory Control Migration Preflight

Run `npm run test:phase128:contract` from `apps/api`. The preflight defaults to offline export/manifest analysis; optional live index inventory is explicitly opt-in and read-only. Review `PHASE128_NOTES.md`. The tool never applies a migration.


## Phase 129 — Inventory Migration Rehearsal

See `PHASE129_NOTES.md` for the offline rehearsal inputs, command, report outputs, rollback manifest, and safety gates. The rehearsal never applies a migration; `mayApplyMigration` remains false.


## Phase 130 — Inventory Migration Execution Safeguards

See `PHASE130_NOTES.md`. This pre-execution guard validates approval, backup/restore evidence and plan shape. It never executes writes; production targets are rejected.


## Phase 131 — Inventory Migration Reconciliation

See `PHASE131_NOTES.md` for offline before/after export comparison and safety semantics. Reconciliation never authorizes migration or rollback.

## Phase 132 — Inventory Migration Release Decision & Evidence Pack

See `PHASE132_NOTES.md` for the offline evidence evaluator, input format, decision semantics, and safety limits. Run the contract tests with `npm run test:phase132:contract` from `apps/api`. A conditional result never authorizes migration execution or production targeting.

## Phase 133 — Post-Change Verification & Operational Monitoring

See `PHASE133_NOTES.md` for the offline checklist and baseline/post-change metric comparator. Run contract tests from `apps/api` with `npm run test:phase133:contract`. The tool never authorizes deployment or migration.

## Phase 134 — Incident Response & Rollback Decision Framework

See `PHASE134_NOTES.md` for incident evidence format, severity guidance and rollback safeguards. Run contract tests from `apps/api` with `npm run test:phase134:contract`. This tool never executes rollback or production actions.

## Phase 135 — Incident Register & Corrective Action Tracking

See `PHASE135_NOTES.md` for the offline incident register, recurrence checks, action tracking, and closure rules. Run contract tests from `apps/api` with `npm run test:phase135:contract`.

## Phase 136 — Corrective Action Effectiveness & Continuous Improvement

See `PHASE136_NOTES.md`. The offline JSON evaluator reviews effectiveness outcomes, metric comparability, evidence references, repeat incidents, and follow-up governance. Run `npm run test:phase136:contract` from `apps/api`.

## Phase 137 — Continuous Improvement Action Plan & Tracking

See `PHASE137_NOTES.md`. Adds offline action tracking validation for ownership, priority, due dates, blockers, progress, completion evidence, and effectiveness-review linkage.

## Phase 138 — Management KPI Dashboard & Analytics

See `PHASE138_NOTES.md`. Adds an offline JSON KPI report for incidents, corrective actions, effectiveness reviews, and operational compliance by area.


## Phase 139 — Forestry & Apiary Performance Scorecards

See `PHASE139_NOTES.md` for the offline JSON input contract, metrics, usage, and limitations. Run `node scripts/phase139-forestry-apiary-scorecards-contract-tests.js` to validate the module.


## Phase 140 — Farm Operations & Field Inspection System

See `PHASE140_NOTES.md` for inspection/task schemas, usage, and limitations. Run `node scripts/phase140-farm-operations-inspections-contract-tests.js` for contract tests.


## Phase 141 — Corrective Action & Preventive Action (CAPA)
See `PHASE141_NOTES.md` for schema, commands, reporting rules, and limitations. Run tests with `node scripts/phase141-capa-management-contract-tests.js`.


## Phase 142 — Farm Task Scheduling & Workforce Execution
See `PHASE142_NOTES.md` for task statuses, data fields, commands, and limitations. Run contract tests with `node scripts/phase142-farm-task-execution-contract-tests.js`.


## Phase 143 — Supervisor Verification & Field Evidence Management

See `PHASE143_NOTES.md`. Run `node scripts/phase143-supervisor-verification-evidence-contract-tests.js` for the contract suite. The JSON report engine validates supervisor decisions, evidence references, quality checklists, quantity acceptance, rework and overdue reviews.


## Phase 144 — Automated Corrective Action & Recurring-Failure Intelligence

See `PHASE144_NOTES.md`. Run `node scripts/phase144-recurring-failure-intelligence-contract-tests.js` to validate recurring-failure grouping, severity, corrective-action status, and overdue-action alerts.


## Phase 145 — Unified Farm Operations Intelligence & Executive Dashboard

Build a deterministic offline executive snapshot from a manually consolidated JSON file. See `PHASE145_NOTES.md` for the input contract, CLI commands, KPI calculations, and limitations. Contract tests: `node scripts/phase145-unified-farm-operations-dashboard-contract-tests.js`.


## Phase 146 — Automated Data Integration Pipeline

Loads individual JSON source reports, maps supported aliases into the Phase 145 dashboard schema, and records SHA-256 lineage and data-quality warnings. See `PHASE146_NOTES.md`. Contract tests: `node scripts/phase146-automated-data-integration-pipeline-contract-tests.js`.


## Phase 147 — Data Quality & Reconciliation Engine

Phase 147 adds deterministic offline reconciliation for source snapshots, including configurable metric tolerances, stale/future source dates, missing/invalid metrics, duplicate records, a heuristic quality score, and `ready` / `review_required` / `blocked` status. See `PHASE147_NOTES.md` and `phase147-example-input.json` for the input schema and usage. Run `node scripts/phase147-data-quality-reconciliation-engine-contract-tests.js` for its contract tests. This does not yet connect to production data stores or automatically consume Phase 146 output.


## Phase 148 — Decision & Action Intelligence Engine

Phase 148 converts Phase 147 reconciliation issues and selected operational threshold signals into deterministic, prioritized action proposals with suggested due dates, evidence requirements, and escalation guidance. It is advisory only and does not assign named owners or execute actions. See `PHASE148_NOTES.md` and `phase148-example-input.json`. Run `node scripts/phase148-decision-action-intelligence-engine-contract-tests.js` to validate the engine.


## Phase 149 — Corrective Action Lifecycle & Verification Engine

Phase 149 adds an offline corrective-action lifecycle ledger with explicit assignment, progress, evidence capture, independent verification, ineffective outcomes, reopening, cancellation and event history. See `PHASE149_NOTES.md` and `phase149-example-input.json`. Run `node scripts/phase149-corrective-action-lifecycle-verification-engine-contract-tests.js` to validate it. This utility does not provide production authentication, database persistence, file storage, notifications or concurrent-write protection.

## Phase 150 — Management Command Centre

Build a deterministic executive report from local JSON snapshots covering forestry, apiary, workforce, inspections, data quality, corrective actions, and management decision actions. Missing sections remain `not_provided` rather than being treated as zero.

```bash
node scripts/phase150-management-command-centre.js --input=phase150-example-input.json --output=phase150-report.json --now=2026-10-29
node scripts/phase150-management-command-centre-contract-tests.js
```
See `PHASE150_NOTES.md` for the input contract, management rules, and production limitations.

## Phase 151 — Live Operations & Data Integration Gateway

Validates local JSON record batches, quarantines malformed and duplicate rows, reports per-domain counters, and emits SHA-256 lineage checksums. This is an offline prototype, not a live connected gateway.

```bash
node scripts/phase151-live-operations-data-integration-gateway.js --input=phase151-example-input.json --output=phase151-gateway-report.json --now=2026-10-29
node scripts/phase151-live-operations-data-integration-gateway-contract-tests.js
```
See `PHASE151_NOTES.md` for the input contract and production boundaries.


## Phase 152 — Master Data Registry & Idempotent Import Engine

See `PHASE152_NOTES.md`. Run `node scripts/phase152-master-data-registry-idempotent-import-contract-tests.js` for contract tests, or use `scripts/phase152-master-data-registry-idempotent-import.js` to reconcile an offline JSON batch against a supplied master snapshot. This prototype does not connect to live persistence.


## Phase 152 — Master Data Registry & Idempotent Import Engine

See `PHASE152_NOTES.md`. Run `node scripts/phase152-master-data-registry-idempotent-import-contract-tests.js` for contract tests, or use `scripts/phase152-master-data-registry-idempotent-import.js` to reconcile an offline JSON batch against a supplied master snapshot. This prototype does not connect to live persistence.


## Phase 153 — Transactional Persistence Adapter

See `PHASE153_NOTES.md`. Run `node scripts/phase153-transactional-persistence-adapter-contract-tests.js` for contract tests. The current persistence implementation is a local JSON-file prototype, not a production database.


## Phase 154 — MongoDB Transactional Persistence Adapter

See `PHASE154_NOTES.md`. Contract tests run with `node scripts/phase154-mongodb-transactional-persistence-adapter-contract-tests.js`. The adapter is not yet wired into the NestJS API; live MongoDB replica-set integration remains required.


## Phase 155 — API Database Integration

See `PHASE155_NOTES.md`. The NestJS registry persistence route is `POST /api/registry-persistence/batches`; tenant identity is taken from verified JWT claims. Run `node scripts/phase155-api-database-integration-contract-tests.js` for static integration contract checks. Live MongoDB replica-set verification remains required.


## Phase 156 — MongoDB Transaction Reliability

See `PHASE156_NOTES.md`. Run the no-database reliability checks with `node scripts/phase156-mongodb-reliability-contract-tests.js`. The opt-in live replica-set suite is `node scripts/phase156-mongodb-integration-tests.js` and requires an explicit disposable `FORESTOS_TEST_MONGODB_URI`.


## Phase 157 — API Reliability Audit

See `PHASE157_NOTES.md`. Run `node scripts/phase157-api-reliability-audit.js` for static reliability checks. The Phase 156 MongoDB integration suite now includes a concurrent stale-writer scenario but still requires a disposable replica-set URI.


## Phase 158 — Build Verification & Live Integration Readiness

Run `node scripts/phase158-build-integration-preflight.js` for a read-only build/integration preflight, or add `--json` for a machine-readable report. Run `node scripts/phase158-build-integration-preflight-contract-tests.js` for contract checks. The optional `--check-mongodb` mode requires `FORESTOS_TEST_MONGODB_URI` to point at a clearly named disposable test database and checks replica-set/session prerequisites without writing data. This is a readiness check, not a substitute for a real API build or Phase 156 live integration suite.


## Phase 158 — Build Verification & Live Integration Readiness

Run `node scripts/phase158-build-integration-preflight.js` for a read-only build/integration preflight, or add `--json` for a machine-readable report. Run `node scripts/phase158-build-integration-preflight-contract-tests.js` for contract checks. The optional `--check-mongodb` mode requires `FORESTOS_TEST_MONGODB_URI` to point at a clearly named disposable test database and checks replica-set/session prerequisites without writing data. This is a readiness check, not a substitute for a real API build or Phase 156 live integration suite.


## Phase 159 — Idempotent Retry & Optimistic Write Safeguards

Phase 159 hardens the registry persistence API retry path: committed batch retries are resolved before stale expected-revision checks, retries report the original commit revision, and conditional record writes fail explicitly when their optimistic match/upsert does not occur. Run `node scripts/phase159-idempotent-retry-contract-tests.js` for source-level contract checks. Live MongoDB transaction validation and a dependency-installed NestJS build remain required before production use.

## Phase 160 — Runtime verification gate
- `node scripts/phase160-runtime-verification-contract-tests.js` — verifies the runtime verification guardrails.
- `node scripts/phase160-runtime-verification.js` — attempts a NestJS build when local dependencies exist, optionally runs live MongoDB integration tests only with `FORESTOS_TEST_MONGODB_URI` pointing to a clearly named disposable test database, and writes `PHASE160_RUNTIME_VERIFICATION.json`.
- A skipped build or skipped database test is not a passing runtime test. See `PHASE160_NOTES.md` and `PHASE160_VALIDATION.json`.

## Phase 161 — Live API Tenant Isolation Probe

Run `node scripts/phase161-tenant-isolation-probe-contract-tests.js` for local contract checks. The opt-in `node scripts/phase161-live-tenant-isolation-probe.js` makes read-only GET requests using two distinct test-tenant tokens when configured via `FORESTOS_TEST_API_BASE_URL`, `FORESTOS_TEST_READ_PATH`, `FORESTOS_TEST_TENANT_A_TOKEN`, `FORESTOS_TEST_TENANT_B_TOKEN`, `FORESTOS_TEST_TENANT_A_ID`, and `FORESTOS_TEST_TENANT_B_ID`. It writes `PHASE161_TENANT_ISOLATION_REPORT.json`. It is a smoke probe, not proof of comprehensive isolation; see `PHASE161_NOTES.md`.

## Phase 162 — Live API Readiness Smoke Test

Run `node scripts/phase162-live-api-smoke-contract-tests.js` for local contract checks. The opt-in `node scripts/phase162-live-api-smoke.js` performs read-only GET smoke tests when `FORESTOS_TEST_API_BASE_URL` is configured. It checks `/api/health` by default; optionally set `FORESTOS_TEST_HEALTH_PATH`, `FORESTOS_TEST_READ_PATH`, and a dedicated `FORESTOS_TEST_API_TOKEN` for a protected read endpoint. HTTPS is required except for localhost. It writes `PHASE162_LIVE_API_SMOKE_REPORT.json`. HTTP status checks are not proof of business correctness or security; see `PHASE162_NOTES.md`.

## Phase 163 — Registry Batch Live Integration Probe
Run `node scripts/phase163-registry-batch-integration-contract-tests.js` for static contract checks. The opt-in `node scripts/phase163-registry-batch-integration-probe.js` performs a POST plus exact replay against the registry persistence endpoint only when API URL, dedicated token, tenant ID, `FORESTOS_TEST_ALLOW_WRITES=YES`, and a test-named disposable database are configured. It writes `PHASE163_REGISTRY_BATCH_INTEGRATION_REPORT.json`. This creates a test record and must never be aimed at production. See `PHASE163_NOTES.md`.

## Phase 164 — Transaction Integrity Integration Tests

Phase 164 adds an opt-in MongoDB integration harness for the registry persistence service. It checks rejected-batch non-persistence, multi-record commits, revision integrity, stale revision and version conflict behaviour, and idempotent retry identity. Run static contract checks with `node scripts/phase164-transaction-integrity-contract-tests.js`. Live tests require a built API, a disposable MongoDB replica-set database, `FORESTOS_TEST_MONGODB_URI`, `FORESTOS_TEST_DATABASE_NAME`, and `FORESTOS_TEST_ALLOW_WRITES=YES`. The URI's database name must exactly match the declared test database name. Read `PHASE164_NOTES.md` for limitations; static tests do not prove live transaction behaviour.


## Phase 165 — Concurrency & Recovery Verification

Run `node scripts/phase165-concurrency-recovery-contract-tests.js` for source-level checks. The opt-in `node scripts/phase165-concurrency-recovery-integration-tests.js` races two distinct batches using the same expected revision and asserts that exactly one commits. Live execution requires a built API, a disposable MongoDB replica set, `FORESTOS_TEST_MONGODB_URI`, a matching `FORESTOS_TEST_DATABASE_NAME` with a standalone `test` marker, and `FORESTOS_TEST_ALLOW_WRITES=YES`. Static checks do not establish live concurrency correctness; see `PHASE165_NOTES.md`.


## Phase 166 — Transaction Fault Injection & Rollback Verification

Run `node scripts/phase166-transaction-fault-injection-contract-tests.js` for static contract checks. The opt-in `node scripts/phase166-transaction-fault-injection-integration-tests.js` configures a MongoDB validator to reject the second write in a batch and asserts that the first write, batch ledger entry, and revision are all rolled back. Live execution requires a built API, disposable MongoDB replica set, matching test database URI/name, and `FORESTOS_TEST_ALLOW_WRITES=YES`. See `PHASE166_NOTES.md`; static checks do not establish live rollback correctness.

## Phase 167 — Recovery, Idempotency & Release Readiness

Run `node scripts/phase167-recovery-idempotency-contract-tests.js` for source-level guardrail checks. The opt-in `node scripts/phase167-recovery-idempotency-integration-tests.js` injects a storage validation failure, verifies rollback, then commits a separate valid batch and retries it to check stable commit identity, no duplicate records/ledger entries, and no extra revision. Live execution requires a built API, disposable MongoDB replica set, exact URI/database-name match with a standalone `test` marker, and `FORESTOS_TEST_ALLOW_WRITES=YES`. Static checks are not live runtime evidence. See `PHASE167_NOTES.md` and `PHASE167_VALIDATION.json`.

## Phase 168 — Production Release Gate & Deployment Readiness

Run `node scripts/phase168-production-release-gate-contract-tests.js` for gate contract checks, then `node scripts/phase168-production-release-gate.js` to generate `PHASE168_RELEASE_GATE_REPORT.json`. The gate runs contract suites from phases 164–167, checks build prerequisites, identifies missing live MongoDB evidence, and marks authorization/configuration items for review. It does not automatically perform destructive live database tests. `NOT VERIFIED` and `REVIEW REQUIRED` are not passes; the release remains not ready while evidence is incomplete. See `PHASE168_NOTES.md`.

## Phase 169 — Production Security & Tenant-Isolation Audit

Run `node scripts/phase169-security-tenant-isolation-contract-tests.js` to validate the static audit's core safeguards, then run `node scripts/phase169-security-tenant-isolation-audit.js` to generate `PHASE169_SECURITY_TENANT_ISOLATION_AUDIT.json`. The audit inventories controller route declarations and visible guard, role-policy, and tenant-context signals. It is read-only and does not connect to MongoDB. Static source signals do not prove runtime authorization or tenant isolation; cross-tenant and role-matrix integration tests remain required before production approval. See `PHASE169_NOTES.md`.


## Phase 170 — Runtime Authorization & Cross-Tenant Verification

Phase 170 adds an opt-in, read-only HTTP probe for two dedicated test tenants. It checks authenticated reads, visible tenant-ID separation, and rejection of missing/invalid bearer tokens. It writes `PHASE170_RUNTIME_AUTHORIZATION_REPORT.json` and never prints tokens or response bodies.

Run the source-level contract checks with `node scripts/phase170-runtime-authorization-contract-tests.js`. For the live probe, configure the dedicated non-production environment variables described in `PHASE170_NOTES.md`, then run `node scripts/phase170-runtime-authorization-probe.js`. The probe is limited to configured GET endpoints and is not a security certification.


## Phase 171 — Security Remediation Readiness
Adds a read-only source checklist and machine-readable report for authorization, tenant isolation, DTO validation, and runtime evidence gaps. The report intentionally defaults to NOT CLEARED FOR PRODUCTION. See `PHASE171_NOTES.md`.


## Phase 172 — Tenant-Scoped Data Access Verification
Added a read-only heuristic inventory for service/controller database-operation contexts. It generates `PHASE172_TENANT_DATA_ACCESS_REPORT.json`, flags contexts requiring manual tenant-scope review, and explicitly keeps production clearance blocked until live cross-tenant tests and full review are complete. See `PHASE172_NOTES.md`.


## Phase 173 — Critical Registry Query Tenant-Scope Review

Adds focused source-level regression checks for registry persistence tenant scoping and a machine-readable report. Run `node scripts/phase173-registry-tenant-scope-contract-tests.js` and `node scripts/phase173-registry-tenant-scope-audit.js`. Static checks are not runtime security proof; live cross-tenant tests remain required. See `PHASE173_NOTES.md`.

## Phase 174 — Live Cross-Tenant Registry Isolation Probe

Adds an opt-in, read-only two-tenant HTTP probe for configured test GET endpoints. It checks visible tenant IDs and unique record markers, uses same-origin endpoint paths, disables redirects, enforces timeouts and response-size limits, and never logs credentials or response bodies. Run `node scripts/phase174-live-registry-isolation-contract-tests.js` and, only after configuring dedicated non-production fixtures, `node scripts/phase174-live-registry-isolation-probe.js`. The probe does not test writes or prove application-wide security. See `PHASE174_NOTES.md`.

## Phase 175 — Cross-Tenant Write Protection & Mutation Integrity

Adds an opt-in disposable-environment probe that attempts one cross-tenant PATCH and re-reads the owner's fixture to verify its unique marker remains present. It requires explicit mutation opt-in and never logs credentials or response bodies. Run `node scripts/phase175-cross-tenant-write-contract-tests.js`; only run `node scripts/phase175-cross-tenant-write-protection-probe.js` against a dedicated disposable non-production environment after reading `PHASE175_NOTES.md`. This is not application-wide security proof and production remains not cleared.

## Phase 176 — Audit Trail Integrity & Tenant Attribution Readiness

Adds a read-only audit of the generic operational and financial audit trails, focusing on tenant attribution, listing scope, role signals, append-only controls, and sensitive metadata minimization. Run `node scripts/phase176-audit-trail-integrity-contract-tests.js` and `node scripts/phase176-audit-trail-integrity-audit.js`. The report intentionally keeps production clearance blocked when review is required. Do not infer tenant identity from email or treat static source signals as runtime proof. See `PHASE176_NOTES.md`.

## Phase 177 — Tenant-Aware Audit Architecture & Migration Planning

Phase 177 adds a read-only inventory of operational audit writer call-site files and a staged, compatibility-first migration plan for operational and financial audit tenant attribution. It intentionally does not modify schemas or records. Run `node scripts/phase177-audit-tenant-migration-plan-contract-tests.js` for contract checks and `node scripts/phase177-audit-tenant-migration-plan.js` to regenerate `PHASE177_AUDIT_TENANT_MIGRATION_PLAN.json`. Legacy records with ambiguous ownership must remain unresolved; never infer tenant identity from email. Production remains uncleared until reviewed migration, build, and runtime security evidence are available.


## Phase 178 — Explicit Tenant Context & Audit Writer Remediation

Adds an explicit tenant-aware operational audit writer, tenant-scoped audit listing, optional schema attribution and contract checks. Legacy audit writers remain compatible but produce unattributed events that are excluded from tenant-scoped lists until reconciled. See `PHASE178_NOTES.md`; production clearance remains blocked pending call-site conversion and runtime verification.


## Phase 179 — Audit Writer Conversion & Tenant Attribution Coverage

Converts plantation create/update audit events to the explicit tenant-aware writer using validated organization context. Adds a static inventory of remaining legacy writer calls and contract checks. Run `node scripts/phase179-audit-writer-conversion-contract-tests.js` and `node scripts/phase179-audit-writer-coverage-audit.js`. This is a partial migration; remaining legacy writers and live runtime security still require review. Production remains not cleared. See `PHASE179_NOTES.md`.

## Phase 180 — Audit Writer Migration Readiness
Adds a call-site-level readiness inventory for remaining legacy audit writer calls. It records source file/line, whether tenant-context signals appear in that service file, and the trusted-context checks required before conversion. The scan is intentionally not an automatic migration: a tenant must come from validated authenticated membership and be explicitly passed to the tenant-aware writer. Run `node scripts/phase180-audit-writer-migration-readiness.js` and `node scripts/phase180-audit-writer-migration-readiness-contract-tests.js`. Static context signals are not a security certification; production remains not cleared.

## Phase 181 — Audit Writer Call-Chain Trace
Adds a static trace from each remaining legacy audit writer call site to its same-module controller, including visible role-decorator, guard-syntax, and tenant-context signals. These are investigative signals, not runtime security proof. No calls were automatically converted because trusted tenant context must be traced and passed explicitly. Run `node scripts/phase181-audit-call-chain-trace.js` and `node scripts/phase181-audit-call-chain-trace-contract-tests.js`. Production remains not cleared pending build and live authorization/tenant-isolation tests. See `PHASE181_NOTES.md`.

## Phase 182 — Authentication Guard Configuration & Public Route Audit
Adds a static review of NestJS `APP_GUARD` registration, JWT verification, role metadata checks, global validation, environment-based JWT secret usage, and all `@Public()` annotations. It helps distinguish configuration signals from runtime proof and lists the next required live tests. Run `node scripts/phase182-auth-guard-configuration-audit.js` and `node scripts/phase182-auth-guard-configuration-contract-tests.js`. No live HTTP/database tests are performed; production remains not cleared. See `PHASE182_NOTES.md`.

## Phase 183 — Public Route Review & JWT Startup Safety Gate

Phase 183 adds a static register of every `@Public()` annotation with source location, nearby controller/HTTP decorator signals, human-approval status, and review questions. It separately records static evidence relevant to production JWT secret startup enforcement. The scanner does not change application source, make network/database calls, or prove runtime security.

Run from the project root:

- `node scripts/phase183-public-route-and-jwt-startup-gate.js`
- `node scripts/phase183-public-route-and-jwt-startup-gate-contract-tests.js`

Review `PHASE183_PUBLIC_ROUTE_JWT_STARTUP_GATE.json`. All public routes require explicit human approval. Add controlled production-startup tests for missing/insecure `JWT_SECRET`, then execute live HTTP authentication, role, tenant-membership and cross-tenant isolation tests before any production release.


## Phase 184 — JWT Startup Safety Gate

Adds a fail-closed JWT secret policy integrated into `AuthModule`. The API refuses to register JWT authentication when `JWT_SECRET` is missing, blank, or a known placeholder; production additionally requires at least 32 characters and rejects repeated-character values. No default secret is introduced. Run `node scripts/phase184-jwt-startup-safety-audit.js` and `node scripts/phase184-jwt-startup-safety-contract-tests.js`. Supply secrets through deployment secret management. A build and live authentication/tenant-isolation tests remain required; production is not cleared. See `PHASE184_NOTES.md`.

## Phase 185 — Authentication Runtime Readiness

Adds a repeatable source-level readiness probe for bearer-token handling, JWT verification, role checks, active-user login, bcrypt password comparison, owner setup safeguards, and JWT secret policy. Run `node scripts/phase185-auth-runtime-readiness.js` and `node scripts/phase185-auth-runtime-readiness-contract-tests.js`. This is not a live runtime test. The report flags a configuration consistency issue for review: `AuthModule` supplies the resolved startup secret to `JwtModule`, while `AuthGuard` explicitly supplies `process.env.JWT_SECRET` to `verifyAsync`. Align these sources and verify with a NestJS build and controlled live HTTP tests before production. See `PHASE185_NOTES.md`.

## Phase 186 — JWT Verification Configuration Consistency

Aligns the global `AuthGuard` with the validated JWT secret already configured in `JwtModule`: verification now uses `JwtService.verifyAsync(token)` rather than re-reading `process.env.JWT_SECRET`. This removes the duplicate secret source while preserving bearer-token, unauthorized-response and role checks. Run `node scripts/phase186-jwt-verification-consistency-audit.js` and `node scripts/phase186-jwt-verification-consistency-contract-tests.js`. The checks are static; build and controlled live authentication/tenant-isolation tests remain required. See `PHASE186_NOTES.md`.


## Phase 187 — Dependency-Free JWT Contract Probe

Adds a Node.js built-in-crypto probe covering expected HS256 token behavior, signature tampering, expiry, not-before claims, malformed tokens, algorithm rejection, Bearer parsing, and role checks. This probe models the contract; it does not invoke NestJS JwtService/AuthGuard or live HTTP/database services. Run `node scripts/phase187-jwt-runtime-contract-probe.js` and `node scripts/phase187-jwt-runtime-contract-tests.js`. A real NestJS build and live authentication/tenant-isolation tests remain required; production is not cleared. See `PHASE187_NOTES.md`.

## Phase 188 — Real Application Authentication Test Harness

Adds an opt-in, read-only HTTP smoke probe against the actual running API. It checks `GET /api/auth/me` rejects missing and invalid bearer tokens and optionally accepts a short-lived test token. It uses explicit non-production opt-in, same-origin path validation, disabled redirects, bounded timeouts, and does not print tokens or response bodies. Also adds a build/runtime prerequisite preflight. Run `node scripts/phase188-authentication-http-smoke-contract-tests.js` and `node scripts/phase188-runtime-build-preflight.js`. Live probe instructions are in `PHASE188_NOTES.md`. The probe was not executed during package generation; production remains not cleared.

## Phase 189 — Reproducible API build readiness
Run `node scripts/phase189-build-reproducibility-audit.js` to check whether the API build prerequisites are present. This is a preflight only; it does not install packages or run the build. See `PHASE189_NOTES.md` for the recommended clean-install and build workflow.

## Phase 190 — Dependency Lockfile & Clean Build Recovery

Adds a bounded npm lockfile bootstrap command and a non-mutating readiness audit. From `apps/api`, run `npm run bootstrap:phase190:lockfile` in a registry-enabled environment, review and commit `package-lock.json`, then run `npm ci --ignore-scripts --no-audit --no-fund` and `npm run build`. The lockfile was not generated in the packaging environment because the registry operation timed out; no lockfile is fabricated. Run `node scripts/phase190-build-lockfile-readiness.js` and `node scripts/phase190-build-lockfile-contract-tests.js` from the repository root. Build and live security tests remain outstanding; production is not cleared. See `PHASE190_NOTES.md`.

## Phase 191 — Clean Installation & Build Verification Gate

Phase 191 adds a fail-closed, explicit-mode gate for build recovery. From `apps/api`, use `npm run preflight:phase191:build` for read-only checks, `npm run install:phase191:clean` to run `npm ci` only after a valid aligned lockfile exists, and `npm run build:phase191:verified` to run the build after install. See `PHASE191_NOTES.md` and `PHASE191_CLEAN_INSTALL_BUILD_REPORT.json`. Current blocker: `apps/api/package-lock.json` is missing; no clean install or build has been claimed.


## Phase 192 — Dependency Resolution Diagnostics & Lockfile Recovery

Adds an offline-safe dependency manifest/lockfile diagnostic and an opt-in bounded npm registry ping. It does not install packages, run the build, or fabricate a lockfile. Run `node scripts/phase192-dependency-recovery-diagnostics.js` for local checks, append `--check-registry` to explicitly test registry access, and run `node scripts/phase192-dependency-recovery-contract-tests.js` for contract checks. The lockfile generation attempt timed out in the packaging environment; perform bootstrap, clean install and build in a registry-enabled environment. Production remains not cleared. See `PHASE192_NOTES.md`.

## Phase 193 — Lockfile Recovery Gate & Registry-Enabled Bootstrap

Adds a bounded, explicit lockfile generation command that refuses to overwrite an existing lockfile, disables lifecycle scripts and retries, and validates lockfile version plus root package identity. Run `node scripts/phase193-lockfile-recovery-gate.js` for offline preflight or add `--generate-lockfile` in a registry-enabled environment. Inspect any generated lockfile before running `npm ci` and `npm run build`. The phase does not claim clean-install/build success; production remains not cleared. See `PHASE193_NOTES.md`.

## Phase 194 — Dependency Recovery & Actual API Compilation Orchestrator
Adds a bounded orchestration gate for actual clean install and NestJS compilation. Preflight is read-only; `--install` requires a lockfile aligned to the API manifest; `--build` requires the local Nest CLI; `--all` runs install followed by build. Commands write `PHASE194_API_BUILD_RECOVERY_REPORT.json` and never mark production cleared. Run `node scripts/phase194-api-build-recovery-contract-tests.js`; see `PHASE194_NOTES.md`.

## Phase 195 — Registry & Lockfile Recovery Diagnostics

Adds an offline-safe diagnostic and an opt-in bounded npm registry ping after repeated lockfile generation timeouts. It validates the API manifest and lockfile alignment without fabricating a lockfile or running install/build. Run `node scripts/phase195-registry-lockfile-recovery-diagnostics.js`, optionally add `--check-registry`, and execute `node scripts/phase195-registry-lockfile-recovery-contract-tests.js`. The report is `PHASE195_REGISTRY_LOCKFILE_RECOVERY_REPORT.json`. See `PHASE195_NOTES.md`; production remains not cleared.

## Phase 196 — Local Lockfile Recovery

Adds a read-only scan for existing trusted lockfile artifacts matching the API package identity, with candidate size/count limits, SHA-256 evidence, and explicit `--recover` mode that refuses to overwrite. Run `node scripts/phase196-local-lockfile-recovery.js` to scan; use `--recover` only after reviewing source provenance. No matching local lockfile was found in this package, so the API lockfile remains missing. Registry access is still required unless a trusted exact-match lockfile is obtained from version control or CI. No install/build was run; production remains not cleared. See `PHASE196_NOTES.md`.

## Phase 197 — Trusted Lockfile Provenance Gate

Run `node scripts/phase197-trusted-lockfile-provenance-gate.js` to fingerprint the API manifest and validate any existing lockfile's JSON and root package identity. The gate records Node/npm and available Git/CI metadata, distinguishes structural alignment from trusted provenance, and leaves installation/build untouched. Current status is blocked because `apps/api/package-lock.json` is missing. See `PHASE197_TRUSTED_LOCKFILE_PROVENANCE_REPORT.json`, `PHASE197_VALIDATION.json`, and `PHASE197_NOTES.md`.

## Phase 198 — Trusted Lockfile Intake
Phase 198 adds a read-only lockfile preflight and an explicit candidate inspection/import path. Candidate lockfiles must align exactly with the API manifest's root identity and dependency maps. See `PHASE198_NOTES.md`. Structural alignment does not establish provenance; verify trusted Git/CI origin independently. No installation, build, or production clearance is performed by the intake tool.

## Phase 199 — Build Evidence & Release Gate
Adds a read-only preflight plus an explicit, bounded `--build` mode that records manifest/lockfile SHA-256 fingerprints, root dependency alignment, dependency installation state, and actual build exit status. Run `node scripts/phase199-build-evidence-gate.js` for preflight, `node scripts/phase199-build-evidence-gate.js --build` to attempt compilation only when prerequisites exist, and `node scripts/phase199-build-evidence-gate-contract-tests.js` for contract tests. It does not fabricate a lockfile or install packages; successful compilation alone never clears production. See `PHASE199_NOTES.md`.

## Phase 200 — Trusted Dependency Recovery & Release Evidence Bundle
Phase 200 aggregates the API manifest/lockfile state, runtime prerequisites, and available prior-phase reports into `PHASE200_RELEASE_EVIDENCE_BUNDLE.json`. Run `node scripts/phase200_release_evidence_bundle.js` for read-only evidence aggregation and `node scripts/phase200_release_evidence_bundle_contract_tests.js` for contract checks. It does not access the network, import a lockfile, install packages, or execute compilation. Production remains not cleared. See `PHASE200_NOTES.md`.


## Phase 201 — Trusted Build Execution Gate

Phase 201 adds an explicit preflight/install/build workflow with machine-readable evidence. See `PHASE201_NOTES.md` and `PHASE201_TRUSTED_BUILD_EXECUTION_REPORT.json`. The API lockfile is currently missing, so install/build remain blocked; production is not cleared.

## Phase 202 — Trusted Lockfile Acquisition Kit

Phase 202 creates a portable handoff for obtaining the API lockfile from a trusted registry-enabled environment. The default command writes a manifest snapshot, its SHA-256 fingerprint, and acquisition instructions under `artifacts/phase202-lockfile-acquisition/`. To inspect a candidate lockfile, run `node scripts/phase202_trusted_lockfile_acquisition_kit.js --validate-candidate /path/to/package-lock.json`. Candidate alignment checks do not prove provenance; verify trusted Git/CI origin independently before using the Phase 201 clean-install/build gate. This phase does not access the network, install dependencies, or compile the API. Production remains not cleared. See `PHASE202_NOTES.md`.

## Phase 203 — Lockfile Provenance Attestation Check

Phase 203 validates a candidate lockfile against an accompanying provenance sidecar: manifest and lockfile SHA-256, package identity/version, lockfile version, and root dependency maps. Run `node scripts/phase203_lockfile_provenance_attestation.js` for preflight, or add `--candidate /path/to/package-lock.json --attestation /path/to/provenance.json` to verify a handoff. See `PHASE203_PROVENANCE_TEMPLATE.json` and `PHASE203_NOTES.md`. The sidecar is unsigned, so independently verify Git/CI provenance. This phase does not import the lockfile, access the network, install dependencies, or compile the API; production remains not cleared.

## Phase 204 — Trusted Source Inventory

Phase 204 adds a read-only inventory of potential lockfile sources in the API directory and Git-tracked workspace paths. It validates candidate lockfile structure and root dependency alignment against `apps/api/package.json`, and records SHA-256 fingerprints. Run `node scripts/phase204_trusted_source_inventory.js` to refresh `PHASE204_TRUSTED_SOURCE_INVENTORY_REPORT.json`; run `node scripts/phase204_trusted_source_inventory_contract_tests.js` for contract tests. The scan does not access the network, install dependencies, import a lockfile, or compile the API. Candidate provenance must still be independently verified; production remains not cleared. See `PHASE204_NOTES.md`.

## Phase 205 — Authoritative Lockfile Handoff

Phase 205 adds a controlled path for obtaining `apps/api/package-lock.json` from an explicitly pinned commit in an authoritative Git clone. It requires `--repo PATH --expected-remote URL --commit FULL_COMMIT_HASH`, compares the clone's `origin` URL exactly, resolves the pinned commit, verifies the manifest matches the current API manifest, and checks lockfile alignment before exporting a candidate and provenance sidecar. The default command is safe and reports missing inputs. Run `node scripts/phase205_authoritative_lockfile_handoff.js` for preflight; only use explicit arguments after independently confirming the repository and commit. See `PHASE205_NOTES.md`. No network fetch, install, build, or production clearance is performed.

## Phase 206 — Lockfile Acceptance Gate

Phase 206 adds an explicit, hash-pinned acceptance gate for a candidate lockfile. It requires independent source review and explicit confirmation, validates package identity/version and dependency alignment, and refuses to overwrite an existing API lockfile. It does not fetch, install, compile, or clear production. See `PHASE206_NOTES.md` and run `node scripts/phase206_lockfile_acceptance_gate.js` for a read-only preflight.

## Phase 207 — Registry Connectivity & Build Recovery
Phase 207 adds a read-only preflight and explicit bounded registry/install/build modes. Run `node scripts/phase207_registry_build_recovery.js` for preflight, add `--probe-registry` to test npm connectivity, `--install` to attempt `npm ci` only with an aligned lockfile, or `--build` to attempt the actual API build when prerequisites exist. It writes `PHASE207_REGISTRY_BUILD_RECOVERY_REPORT.json`. In the validation environment, the registry probe failed with `EAI_AGAIN` and the API lockfile is missing, so installation and compilation remain unexecuted. See `PHASE207_NOTES.md`; production remains not cleared.

## Phase 208 — CI Lockfile Recovery Handoff

Added a manually dispatched GitHub Actions workflow at `.github/workflows/forestos-api-lockfile-recovery.yml` to generate and validate the missing API lockfile in a network-enabled runner, then upload it with provenance metadata for maintainer review. The workflow does not push changes back to the repository. See `PHASE208_NOTES.md` and `PHASE208_VALIDATION.json`. The workflow has not been executed from this workspace; no lockfile or API build is claimed.

## Phase 209 — CI Lockfile Artifact Verification

Phase 209 adds an offline verifier for the lockfile artifact emitted by the Phase 208 GitHub Actions workflow. It checks the artifact's manifest and lockfile hashes against the provenance sidecar, verifies an independently supplied expected commit and manifest SHA-256, validates lockfile identity/version/root dependency maps, and requires an HTTPS registry entry. Run `node scripts/phase209_ci_artifact_verifier.js --artifact-dir /path/to/extracted-artifact --expected-commit FULL_COMMIT_HASH --expected-manifest-sha256 SHA256`. Use `--report PATH` to select a report location. A passing result still requires human source review: the sidecar is unsigned. The verifier never imports, installs, builds, or clears production. See `PHASE209_NOTES.md`.

## Phase 210 — CI Verified API Build

Phase 210 adds `.github/workflows/forestos-api-verified-build.yml`, a manually dispatched workflow that requires the operator to type `BUILD`. It generates the API lockfile in CI if absent, validates package identity/version and root dependency maps, runs `npm ci --ignore-scripts`, then executes `npm run build`. Evidence (source commit, Node/npm versions, registry, SHA-256 fingerprints, lockfile and manifest) is uploaded even if a step fails. The workflow never commits or pushes changes. Run `node scripts/phase210_verified_api_build_contract_tests.js` for local contract checks. The workflow has not been run remotely from this workspace, so no successful install or compilation is claimed. A successful compile alone does not clear production; review the lockfile, runtime, database, and security checks separately. See `PHASE210_NOTES.md`.

## Phase 211 — CI Build Workflow Hardening

Phase 211 hardens `.github/workflows/forestos-api-verified-build.yml`: it removes setup-node caching that could fail while the lockfile is missing, enables normal lifecycle scripts for `npm ci`, compares sorted root dependency maps including `optionalDependencies`, and clarifies build evidence semantics. The workflow remains manually triggered with `BUILD` confirmation, read-only repository permissions, bounded timeouts, and evidence upload on failure. Run `node scripts/phase211_ci_build_hardening_contract_tests.js` and the Phase 210 contract tests. The remote workflow has not been executed here; no clean install or API compilation is claimed. Production remains not cleared. See `PHASE211_NOTES.md`.


## Phase 212 — CI build outcome evidence

Phase 212 strengthens the manually triggered API build workflow by recording the actual outcomes of lockfile generation, clean dependency installation, and NestJS compilation as separate fields. `apiBuildSucceeded` is true only when all three required steps report `success`. The evidence is collected on failure as well, and production clearance remains false.

Run the local contract checks with `node scripts/phase212_ci_build_outcome_evidence_contract_tests.js`. This checks workflow structure; it does not execute GitHub Actions or compile the API.

## Phase 213 — CI Build Evidence Diagnosis

Phase 213 adds a local read-only evidence diagnosis utility for interpreting the build evidence downloaded from the manually triggered API CI workflow. It checks lockfile/install/build outcomes, the overall job conclusion, the source commit format, and the explicit non-production-clearance state. It outputs actionable diagnostics and exits nonzero when a build is not verified. See `PHASE213_NOTES.md` for usage and limitations. This utility does not execute GitHub Actions or substitute for reviewing actual workflow logs.

## Phase 214 — Build stabilisation preflight
Run `node scripts/phase214_build_stabilisation_preflight.js` from the repository root to check the API build script and package-lock consistency before attempting CI. This static check does not install dependencies, compile the API, or clear production.

## Phase 215 — Trusted lockfile recovery

Run `node scripts/phase215_trusted_lockfile_recovery.js --root . --report phase215-lockfile-check.json` to validate the API package identity and any existing lockfile, and to produce the controlled recovery commands. The utility does not create a lockfile, contact the registry, install packages, or run a build. See `PHASE215_NOTES.md` for the trusted recovery sequence.

## Phase 216 — Authoritative CI Handoff

Phase 216 adds `scripts/phase216_authoritative_ci_handoff.js`, a read-only local gate for the API manifest, build script, lockfile identity/dependency alignment, and expected markers in the verified build workflow. Run `node scripts/phase216_authoritative_ci_handoff.js --root . --report PHASE216_CI_HANDOFF_REPORT.json`; run `node scripts/phase216_authoritative_ci_handoff_contract_tests.js` for synthetic-fixture tests. A passing local gate does not execute GitHub Actions, install dependencies, or compile the API. The source workspace still lacks `apps/api/package-lock.json`; production remains not cleared. See `PHASE216_NOTES.md`.

## Phase 217 — Lockfile Generation Runner

Phase 217 adds `scripts/phase217_lockfile_generation_runner.js`. It performs read-only checks by default; use `--generate` to explicitly invoke npm's package-lock-only resolver in `apps/api`. See `PHASE217_NOTES.md`. A structurally valid lockfile is not proof of a successful clean install or API build.

## Phase 218 — Actual API Build Runner

Phase 218 adds `scripts/phase218_actual_api_build_runner.js` for a read-only API build preflight and an explicitly opted-in `--execute` mode that runs `npm ci` and then `npm run build`. See `PHASE218_NOTES.md`. The runner never deploys and never clears production. The actual API build has not been executed in this packaging workspace because the trusted API lockfile is still missing.

## Phase 219 — Manifest/Lockfile Alignment Gate

The API build runner now verifies the lockfile root package entry and exact alignment of dependencies, devDependencies, and optionalDependencies before allowing installation. See `PHASE219_NOTES.md` and `PHASE219_VALIDATION.json`. Local tests do not imply that the API has been installed or compiled; the workspace lockfile remains missing.

## Phase 220 — Authoritative Build Evidence Gate

Phase 220 adds `scripts/phase220_authoritative_build_gate.js`, a fail-closed verifier for evidence from an actual GitHub Actions build. It requires a full expected commit SHA, matching evidence commit, successful dependency installation, successful API build, and successful workflow/job conclusion. It does not authenticate GitHub artifact provenance and never clears production automatically. See `PHASE220_NOTES.md`.
