#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { evaluate } = require('./phase133-post-change-verification');
const checklist = {
  changeTicket: 'CHG-133-EXAMPLE', operator: 'operator-1',
  verifiedAt: '2026-10-27T11:00:00Z', monitoringWindow: '60 minutes',
  rollbackOwner: 'on-call lead', applicationHealthConfirmed: true,
  tenantIsolationSmokeTestsPassed: true, inventoryCountsCompared: true,
  movementLedgerReviewed: true, errorRateWithinThreshold: true,
  latencyWithinThreshold: true, alertsReviewed: true, backupStillAvailable: true,
  rollbackPlanReady: true, businessOwnerSignoff: true,
  productionExecuted: false, changeAuthorityApproval: false, rollbackTriggered: false
};
const metrics = { stockItemCount: 100, stockMovementCount: 250, unassignedItemCount: 0,
  unassignedMovementCount: 0, tenantConflictCount: 0, duplicateCodeCount: 0,
  errorRatePercent: 0.2, p95LatencyMs: 180 };
const release = { decision: 'CONDITIONAL_GO_FOR_SEPARATE_CHANGE_AUTHORITY_REVIEW',
  releaseGate: { requiresSeparateChangeAuthority: true, mayExecuteMigration: false } };
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('PASS ' + name); }
catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; } }
test('clean checklist completes pending human signoff', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.strictEqual(r.decision, 'VERIFICATION_CHECKLIST_COMPLETE_PENDING_HUMAN_SIGNOFF');
  assert.strictEqual(r.releaseGate.deploymentAuthorized, false);
});
test('missing checklist blocks verification', () => {
  const r = evaluate({ checklist: null, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'CHECKLIST_MISSING'));
});
test('failed tenant isolation smoke test blocks', () => {
  const r = evaluate({ checklist: { ...checklist, tenantIsolationSmokeTestsPassed: false }, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.ok(r.findings.some(f => f.evidence && f.evidence.field === 'tenantIsolationSmokeTestsPassed'));
});
test('increased tenant conflicts block verification', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: { ...metrics, tenantConflictCount: 1 }, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'INTEGRITY_METRIC_REGRESSION'));
});
test('increased duplicate codes block verification', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: { ...metrics, duplicateCodeCount: 1 }, releaseDecision: release });
  assert.ok(r.findings.some(f => f.evidence && f.evidence.metric === 'duplicateCodeCount'));
});
test('performance regression requires review', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: { ...metrics, p95LatencyMs: 250 }, releaseDecision: release });
  assert.strictEqual(r.decision, 'REVIEW_REQUIRED');
});
test('inventory count delta requires explanation', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: { ...metrics, stockItemCount: 99 }, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'COUNT_DELTA_REQUIRES_EXPLANATION'));
});
test('missing metrics blocks verification', () => {
  const r = evaluate({ checklist, baseline: null, postChange: metrics, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'METRICS_MISSING'));
});
test('non-numeric metric blocks verification', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: { ...metrics, errorRatePercent: 'low' }, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'METRIC_INVALID'));
});
test('prior NO_GO blocks post-change review', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: metrics, releaseDecision: { ...release, decision: 'NO_GO' } });
  assert.ok(r.findings.some(f => f.code === 'PRIOR_RELEASE_NO_GO'));
});
test('missing release decision blocks verification', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: metrics, releaseDecision: null });
  assert.ok(r.findings.some(f => f.code === 'RELEASE_DECISION_MISSING'));
});
test('production execution without separate approval blocks', () => {
  const r = evaluate({ checklist: { ...checklist, productionExecuted: true }, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'CHANGE_AUTHORITY_APPROVAL_MISSING'));
});
test('rollback trigger produces warning', () => {
  const r = evaluate({ checklist: { ...checklist, rollbackTriggered: true }, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'ROLLBACK_REPORTED'));
});
test('missing separate authority gate blocks', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: metrics, releaseDecision: { decision: release.decision, releaseGate: {} } });
  assert.ok(r.findings.some(f => f.code === 'CHANGE_AUTHORITY_GATE_MISSING'));
});
test('invalid timestamp blocks verification', () => {
  const r = evaluate({ checklist: { ...checklist, verifiedAt: 'not-a-date' }, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.ok(r.findings.some(f => f.code === 'VERIFICATION_TIMESTAMP_INVALID'));
});
test('gate never authorizes migration or deployment', () => {
  const r = evaluate({ checklist, baseline: metrics, postChange: metrics, releaseDecision: release });
  assert.strictEqual(r.releaseGate.migrationAuthorized, false);
  assert.strictEqual(r.releaseGate.deploymentAuthorized, false);
  assert.strictEqual(r.releaseGate.automaticRollbackAuthorized, false);
});
console.log(`${passed}/16 Phase 133 contract tests passed`);
