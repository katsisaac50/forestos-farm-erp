#!/usr/bin/env node
'use strict';
// Phase 126: static, read-only Inventory Control tenant ownership review.
// This script reads source files only. It never connects to MongoDB or mutates records.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = {
  schema: path.join(root, 'apps/api/src/inventory-control/inventory.schema.ts'),
  service: path.join(root, 'apps/api/src/inventory-control/inventory-control.service.ts'),
  controller: path.join(root, 'apps/api/src/inventory-control/inventory-control.controller.ts'),
};
const missing = Object.entries(files).filter(([,p]) => !fs.existsSync(p)).map(([k]) => k);
if (missing.length) {
  console.error(`Missing required source files: ${missing.join(', ')}`);
  process.exit(2);
}
const source = Object.fromEntries(Object.entries(files).map(([k,p]) => [k, fs.readFileSync(p, 'utf8')]));
const findings = [];
function add(id, severity, area, evidence, recommendation) {
  findings.push({id, severity, area, evidence, recommendation});
}
const schema = source.schema, service = source.service, controller = source.controller;
if (!/class\s+StockItem/.test(schema) || !/class\s+StockMovement/.test(schema)) {
  add('P126-001','P1','schema','Expected StockItem/StockMovement declarations were not both found.','Inspect renamed/restructured models before proceeding.');
}
if (/itemCode:\s*string[\s\S]{0,100}?unique:\s*true/.test(schema) || /unique:\s*true[\s\S]{0,100}?itemCode/.test(schema)) {
  add('P126-002','P1','StockItem.itemCode','itemCode is declared unique without a visible organizationId field on StockItem.','Decide whether inventory codes are globally unique or organization-scoped; do not change the index until business ownership and existing duplicates are verified.');
}
if (!/organizationId/.test(schema)) {
  add('P126-003','P1','schema ownership','Neither StockItem nor StockMovement source visibly declares organizationId.','Choose and document the authoritative ownership model; verify parent ownership for every movement before any backfill.');
}
for (const [id, pattern, area, evidence, recommendation] of [
  ['P126-004',/this\.items\.find\(\s*\)/,'dashboard/list queries','dashboard includes an unfiltered items.find() query.','Scope every read to a trusted organization context if this module is tenant-owned.'],
  ['P126-005',/this\.moves\.find\(\s*itemId\s*\?\s*\{\s*itemId\s*\}\s*:\s*\{\s*\}\s*\)/,'movement list query','movement listing can query all movements when itemId is omitted.','Enforce organization scope and validate that any requested item belongs to the same organization.'],
  ['P126-006',/this\.items\.findById\(b\.itemId\)/,'movement parent lookup','Movement posting resolves a stock item by ID only.','Resolve the item within the authenticated organization and derive movement ownership from the verified parent.'],
]) {
  if (pattern.test(service)) add(id,'P1',area,evidence,recommendation);
}
if (!/OrganizationAccessService|organizationId|organizationContext|tenantContext/i.test(controller + service)) {
  add('P126-007','P1','request context','No visible organization/tenant context integration was found in the Inventory Control controller/service.','Integrate the established authenticated organization-context pattern before enabling cross-organization use.');
}
if (/findOne\(\s*\{\s*movementCode\s*\}/.test(service)) {
  add('P126-008','P2','movement code uniqueness','Movement code lookup is global and the schema does not visibly define organization-scoped uniqueness.','Determine required uniqueness and add an index only after duplicate and tenancy review.');
}
const report = {
  phase: 126,
  title: 'Inventory Control Tenant Ownership & Migration Design Audit',
  generatedAt: new Date().toISOString(),
  mode: 'static-source-only-read-only',
  databaseConnectionAttempted: false,
  recordsModified: 0,
  sources: Object.fromEntries(Object.entries(files).map(([k,p]) => [k, path.relative(root,p)])),
  findings,
  decisionGate: {
    migrationApproved: false,
    requiredBeforeMigration: [
      'Product owner explicitly decides whether inventory is global or organization-owned.',
      'Confirm identity and ownership for every legacy StockItem; unresolved records remain quarantined.',
      'For each StockMovement, verify the referenced StockItem exists and determine ownership from that verified parent.',
      'Inventory and movement codes are checked for duplicates under the chosen uniqueness scope.',
      'Generate a reviewed dry-run report, take a restorable backup, and approve a reversible migration plan.',
      'Add tenant-scoped API tests before changing indexes or applying a backfill.'
    ]
  },
  limitations: [
    'Static source heuristics only; not proof of runtime behavior or an exploit.',
    'No MongoDB connection, data inventory, index inspection, NestJS build, or HTTP integration test was performed.'
  ]
};
const out = path.join(root, 'PHASE126_INVENTORY_CONTROL_TENANT_OWNERSHIP_AUDIT.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`Phase 126 static audit: ${findings.length} findings; database connection: none; records modified: 0`);
console.log(`Report: ${path.relative(root, out)}`);
findings.forEach(f => console.log(`${f.severity} ${f.id} [${f.area}] ${f.evidence}`));
