#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { runRehearsal, countByOrg, isObjectId } = require('./phase129-inventory-migration-rehearsal.js');

const orgA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const orgB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const item1 = { _id: 'item-1', itemCode: 'SEED-1', organizationId: '' };
const item2 = { _id: 'item-2', itemCode: 'SEED-2', organizationId: orgB };
const move1 = { _id: 'move-1', itemId: 'item-1', movementCode: 'MV-1', organizationId: '' };
const baseExport = { stockItems: [item1], stockMovements: [move1] };
const baseManifest = { approvals: [{ recordType: 'stockItem', recordId: 'item-1', organizationId: orgA, approvedBy: 'reviewer', evidenceRef: 'TICKET-129' }] };
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${passed}: ${name}`); }

test('accepts a valid ObjectId', () => assert.strictEqual(isObjectId(orgA), true));
test('rejects malformed ObjectId', () => assert.strictEqual(isObjectId('xyz'), false));
test('counts missing org as unassigned', () => assert.deepStrictEqual(countByOrg([{ organizationId: '' }, { organizationId: orgA }]), { [orgA]: 1, __UNASSIGNED__: 1 }));
test('valid rehearsal simulates item and movement ownership', () => {
  const { report, rollback } = runRehearsal(baseExport, baseManifest);
  assert.strictEqual(report.blockerCount, 0);
  assert.strictEqual(report.releaseGate.rehearsalPassed, true);
  assert.strictEqual(report.releaseGate.mayApplyMigration, false);
  assert.strictEqual(report.mapping.proposedOrganizationAssignments, 2);
  assert.strictEqual(rollback.entries.length, 2);
});
test('does not mutate source export', () => {
  const copy = JSON.stringify(baseExport);
  runRehearsal(baseExport, baseManifest);
  assert.strictEqual(JSON.stringify(baseExport), copy);
});
test('flags missing item ownership approval', () => {
  const { report } = runRehearsal(baseExport, { approvals: [] });
  assert(report.findings.some(f => f.code === 'MISSING_OWNERSHIP_APPROVAL'));
});
test('flags duplicate stock item ids', () => {
  const { report } = runRehearsal({ stockItems: [item1, item1], stockMovements: [] }, baseManifest);
  assert(report.findings.some(f => f.code === 'DUPLICATE_RECORD_ID'));
});
test('flags duplicate movement ids', () => {
  const { report } = runRehearsal({ stockItems: [{ _id: 'item-1', organizationId: orgA }], stockMovements: [move1, move1] }, { approvals: [] });
  assert(report.findings.some(f => f.code === 'DUPLICATE_RECORD_ID' && f.recordType === 'stockMovement'));
});
test('flags duplicate approval rows', () => {
  const { report } = runRehearsal(baseExport, { approvals: [...baseManifest.approvals, ...baseManifest.approvals] });
  assert(report.findings.some(f => f.code === 'DUPLICATE_APPROVAL'));
});
test('flags approval for absent item', () => {
  const { report } = runRehearsal(baseExport, { approvals: [{ ...baseManifest.approvals[0], recordId: 'missing' }] });
  assert(report.findings.some(f => f.code === 'APPROVAL_RECORD_NOT_IN_EXPORT'));
});
test('flags invalid organization id', () => {
  const { report } = runRehearsal(baseExport, { approvals: [{ ...baseManifest.approvals[0], organizationId: 'nope' }] });
  assert(report.findings.some(f => f.code === 'INVALID_APPROVED_ORGANIZATION_ID'));
});
test('requires approval evidence', () => {
  const { report } = runRehearsal(baseExport, { approvals: [{ ...baseManifest.approvals[0], evidenceRef: '' }] });
  assert(report.findings.some(f => f.code === 'APPROVAL_EVIDENCE_REQUIRED'));
});
test('flags orphan movement', () => {
  const { report } = runRehearsal({ stockItems: [{ _id: 'item-1', organizationId: orgA }], stockMovements: [{ ...move1, itemId: 'absent' }] }, { approvals: [] });
  assert(report.findings.some(f => f.code === 'ORPHAN_MOVEMENT'));
});
test('flags movement organization conflict', () => {
  const { report } = runRehearsal({ stockItems: [{ _id: 'item-1', organizationId: orgA }], stockMovements: [{ ...move1, organizationId: orgB }] }, { approvals: [] });
  assert(report.findings.some(f => f.code === 'MOVEMENT_PARENT_ORG_CONFLICT'));
});
test('flags duplicate item codes within organization', () => {
  const { report } = runRehearsal({ stockItems: [{ _id: 'a', itemCode: 'X', organizationId: orgA }, { _id: 'b', itemCode: 'X', organizationId: orgA }], stockMovements: [] }, { approvals: [] });
  assert(report.findings.some(f => f.code === 'DUPLICATE_ITEM_CODE_WITHIN_ORG'));
});
test('flags duplicate movement codes within organization', () => {
  const items = [{ _id: 'item-1', organizationId: orgA }];
  const movements = [{ _id: 'm1', itemId: 'item-1', movementCode: 'X', organizationId: orgA }, { _id: 'm2', itemId: 'item-1', movementCode: 'X', organizationId: orgA }];
  const { report } = runRehearsal({ stockItems: items, stockMovements: movements }, { approvals: [] });
  assert(report.findings.some(f => f.code === 'DUPLICATE_MOVEMENT_CODE_WITHIN_ORG'));
});
test('flags conflicting existing item ownership', () => {
  const { report } = runRehearsal({ stockItems: [{ ...item1, organizationId: orgB }], stockMovements: [] }, baseManifest);
  assert(report.findings.some(f => f.code === 'EXISTING_ORG_CONFLICTS_WITH_APPROVAL'));
});
test('flags baseline count mismatch', () => {
  const { report } = runRehearsal(baseExport, baseManifest, { stockItems: 99, stockMovements: 1 });
  assert(report.findings.some(f => f.code === 'BASELINE_COUNT_MISMATCH'));
});
test('blocks missing required collection arrays', () => {
  const { report } = runRehearsal({}, {});
  assert(report.findings.some(f => f.code === 'STOCK_ITEMS_ARRAY_REQUIRED'));
  assert(report.findings.some(f => f.code === 'APPROVALS_ARRAY_REQUIRED'));
});
test('migration gate remains closed even on clean rehearsal', () => {
  const { report } = runRehearsal({ stockItems: [{ _id: 'item-1', organizationId: orgA }], stockMovements: [] }, { approvals: [] });
  assert.strictEqual(report.releaseGate.mayApplyMigration, false);
});
console.log(`Phase 129 contract tests: ${passed}/20 passed`);
