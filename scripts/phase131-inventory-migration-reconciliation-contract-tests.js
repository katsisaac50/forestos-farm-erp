#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { runReconciliation, countByOrg } = require('./phase131-inventory-migration-reconciliation.js');
const A = 'aaaaaaaaaaaaaaaaaaaaaaaa', B = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const before = {
 stockItems: [{ _id:'i1', organizationId:'', itemCode:'X', quantityOnHand:10, unitCost:2 }],
 stockMovements: [{ _id:'m1', itemId:'i1', organizationId:'', quantity:10, unitCost:2 }]
};
const after = {
 stockItems: [{ _id:'i1', organizationId:A, itemCode:'X', quantityOnHand:10, unitCost:2 }],
 stockMovements: [{ _id:'m1', itemId:'i1', organizationId:A, quantity:10, unitCost:2 }]
};
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${passed}: ${name}`); }
test('clean ownership-only comparison passes without authorizing migration', () => {
 const r = runReconciliation(before, after);
 assert.strictEqual(r.blockerCount, 0);
 assert.strictEqual(r.releaseGate.reconciliationPassed, true);
 assert.strictEqual(r.releaseGate.migrationAuthorized, false);
});
test('does not mutate exports', () => {
 const a = JSON.stringify(before), b = JSON.stringify(after);
 runReconciliation(before, after);
 assert.strictEqual(JSON.stringify(before), a); assert.strictEqual(JSON.stringify(after), b);
});
test('counts unassigned organization records', () => assert.deepStrictEqual(countByOrg([{organizationId:''},{organizationId:A}]), { [A]:1, __UNASSIGNED__:1 }));
test('detects missing stock item after export', () => {
 const r = runReconciliation(before, {stockItems:[], stockMovements:after.stockMovements});
 assert(r.findings.some(f=>f.code==='SOURCE_RECORD_MISSING_AFTER' && f.recordType==='stockItem'));
});
test('detects unexpected stock movement', () => {
 const r = runReconciliation(after, {stockItems:after.stockItems, stockMovements:[...after.stockMovements,{_id:'m2',itemId:'i1',organizationId:A}]});
 assert(r.findings.some(f=>f.code==='UNEXPECTED_RECORD_AFTER' && f.recordType==='stockMovement'));
});
test('detects duplicate IDs in before export', () => {
 const r = runReconciliation({stockItems:[...before.stockItems,...before.stockItems],stockMovements:[]},{stockItems:[],stockMovements:[]});
 assert(r.findings.some(f=>f.code==='DUPLICATE_RECORD_ID'));
});
test('detects duplicate IDs in after export', () => {
 const r = runReconciliation(before,{stockItems:[...after.stockItems,...after.stockItems],stockMovements:after.stockMovements});
 assert(r.findings.some(f=>f.code==='DUPLICATE_RECORD_ID'));
});
test('reports ownership changes without treating them as quantity changes', () => {
 const r = runReconciliation(before, after);
 assert.strictEqual(r.stockItems.ownershipChanges.length, 1);
 assert.strictEqual(r.numericDifferences.stockItems.length, 0);
});
test('detects quantity drift', () => {
 const changed = JSON.parse(JSON.stringify(after)); changed.stockItems[0].quantityOnHand = 8;
 const r = runReconciliation(before, changed);
 assert(r.numericDifferences.stockItems.some(d=>d.field==='quantityOnHand' && d.delta===-2));
});
test('detects cost drift', () => {
 const changed = JSON.parse(JSON.stringify(after)); changed.stockItems[0].unitCost = 3;
 const r = runReconciliation(before, changed);
 assert(r.numericDifferences.stockItems.some(d=>d.field==='unitCost'));
});
test('detects invalid numeric values', () => {
 const changed = JSON.parse(JSON.stringify(after)); changed.stockItems[0].unitCost = 'unknown';
 const r = runReconciliation(before, changed);
 assert(r.findings.some(f=>f.code==='INVALID_NUMERIC_FIELD'));
});
test('detects movement-parent ownership conflict', () => {
 const changed = JSON.parse(JSON.stringify(after)); changed.stockMovements[0].organizationId = B;
 const r = runReconciliation(after, changed);
 assert(r.findings.some(f=>f.code==='MOVEMENT_PARENT_ORG_CONFLICT'));
});
test('detects missing or unassigned movement parent', () => {
 const r = runReconciliation(after, {stockItems:[],stockMovements:after.stockMovements});
 assert(r.findings.some(f=>f.code==='MOVEMENT_PARENT_MISSING_OR_UNASSIGNED'));
});
test('requires all export arrays', () => {
 const r = runReconciliation({}, {});
 assert(r.findings.some(f=>f.code==='BEFORE_STOCK_ITEMS_ARRAY_REQUIRED'));
 assert(r.findings.some(f=>f.code==='AFTER_STOCK_MOVEMENTS_ARRAY_REQUIRED'));
});
test('reports before and after counts', () => {
 const r = runReconciliation(before, after);
 assert.deepStrictEqual(r.counts.before, {stockItems:1,stockMovements:1});
 assert.deepStrictEqual(r.counts.after, {stockItems:1,stockMovements:1});
});
test('includes hashes for both input artifacts', () => {
 const r = runReconciliation(before, after);
 assert.match(r.sourceHashes.before, /^[a-f0-9]{64}$/);
 assert.match(r.sourceHashes.after, /^[a-f0-9]{64}$/);
});
test('detects movement numeric differences', () => {
 const changed = JSON.parse(JSON.stringify(after)); changed.stockMovements[0].quantity = 9;
 const r = runReconciliation(before, changed);
 assert(r.numericDifferences.stockMovements.some(d=>d.field==='quantity'));
});
test('reports movement ownership changes', () => {
 const r = runReconciliation(before, after);
 assert.strictEqual(r.stockMovements.ownershipChanges.length, 1);
});
test('keeps automatic rollback authorization disabled', () => {
 const r = runReconciliation(before, after);
 assert.strictEqual(r.releaseGate.rollbackAutomaticallyAuthorized, false);
});
console.log(`Phase 131 contract tests: ${passed}/19 passed`);
