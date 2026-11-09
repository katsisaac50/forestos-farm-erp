#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { runGuard } = require('./phase130-inventory-migration-execution-guard.js');
const oid = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const rehearsal = { phase: 129, findings: [], releaseGate: { rehearsalPassed: true, mayApplyMigration: false } };
const authorization = { approvalStatus: 'approved', approvedBy: 'reviewer-1', changeTicket: 'CHG-130', approvedAt: '2026-10-27T09:00:00Z', environment: 'staging' };
const backup = { backupStatus: 'verified', backupReference: 'backup-130', verifiedBy: 'operator-2', verifiedAt: '2026-10-27T09:10:00Z', restoreTestStatus: 'passed', restoreEvidenceRef: 'restore-test-130' };
const plan = { schemaVersion: 1, mode: 'PLAN_ONLY', mutationEnabled: false, operations: [{ recordType: 'stockItem', recordId: 'item-1', field: 'organizationId', from: null, to: oid }] };
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${passed}: ${name}`); }
test('accepts well-formed staging evidence while execution remains disabled', () => {
  const r = runGuard(rehearsal, authorization, backup, plan);
  assert.strictEqual(r.blockerCount, 0);
  assert.strictEqual(r.releaseGate.guardPassed, true);
  assert.strictEqual(r.releaseGate.mayExecuteMigration, false);
});
test('rejects missing explicit approval', () => assert(runGuard(rehearsal, { ...authorization, approvalStatus: 'pending' }, backup, plan).findings.some(f => f.code === 'EXPLICIT_APPROVAL_REQUIRED')));
test('requires approver identity', () => assert(runGuard(rehearsal, { ...authorization, approvedBy: '' }, backup, plan).findings.some(f => f.code === 'APPROVER_ID_REQUIRED')));
test('requires change ticket', () => assert(runGuard(rehearsal, { ...authorization, changeTicket: '' }, backup, plan).findings.some(f => f.code === 'CHANGE_TICKET_REQUIRED')));
test('requires valid approval timestamp', () => assert(runGuard(rehearsal, { ...authorization, approvedAt: 'yesterdayish' }, backup, plan).findings.some(f => f.code === 'VALID_APPROVAL_TIMESTAMP_REQUIRED')));
test('rejects production target', () => assert(runGuard(rehearsal, { ...authorization, environment: 'production' }, backup, plan).findings.some(f => f.code === 'PRODUCTION_EXECUTION_NOT_SUPPORTED_BY_THIS_GUARD')));
test('requires verified backup', () => assert(runGuard(rehearsal, authorization, { ...backup, backupStatus: 'unknown' }, plan).findings.some(f => f.code === 'VERIFIED_BACKUP_REQUIRED')));
test('requires restore test', () => assert(runGuard(rehearsal, authorization, { ...backup, restoreTestStatus: 'not_run' }, plan).findings.some(f => f.code === 'RESTORE_TEST_MUST_PASS')));
test('requires restore evidence reference', () => assert(runGuard(rehearsal, authorization, { ...backup, restoreEvidenceRef: '' }, plan).findings.some(f => f.code === 'RESTORE_TEST_EVIDENCE_REQUIRED')));
test('rejects non-plan-only mode', () => assert(runGuard(rehearsal, authorization, backup, { ...plan, mode: 'EXECUTE' }).findings.some(f => f.code === 'PLAN_ONLY_MODE_REQUIRED')));
test('rejects mutation enabled', () => assert(runGuard(rehearsal, authorization, backup, { ...plan, mutationEnabled: true }).findings.some(f => f.code === 'MUTATION_MUST_BE_DISABLED')));
test('rejects malformed target organization id', () => assert(runGuard(rehearsal, authorization, backup, { ...plan, operations: [{ ...plan.operations[0], to: 'bad' }] }).findings.some(f => f.code === 'TARGET_ORGANIZATION_ID_INVALID')));
test('rejects unsupported record type', () => assert(runGuard(rehearsal, authorization, backup, { ...plan, operations: [{ ...plan.operations[0], recordType: 'user' }] }).findings.some(f => f.code === 'UNSUPPORTED_RECORD_TYPE')));
test('rejects duplicate plan operation', () => assert(runGuard(rehearsal, authorization, backup, { ...plan, operations: [...plan.operations, ...plan.operations] }).findings.some(f => f.code === 'DUPLICATE_PLAN_OPERATION')));
test('rejects rehearsal with blockers', () => assert(runGuard({ ...rehearsal, findings: [{ severity: 'BLOCKER', code: 'X' }] }, authorization, backup, plan).findings.some(f => f.code === 'REHEARSAL_HAS_BLOCKERS_OR_INVALID_FINDINGS')));
test('rejects failed rehearsal gate', () => assert(runGuard({ ...rehearsal, releaseGate: { rehearsalPassed: false } }, authorization, backup, plan).findings.some(f => f.code === 'REHEARSAL_NOT_PASSED')));
test('requires a valid schema version', () => assert(runGuard(rehearsal, authorization, backup, { ...plan, schemaVersion: 2 }).findings.some(f => f.code === 'PLAN_SCHEMA_VERSION_INVALID')));
test('always prevents execution even when guard passes', () => {
 const r = runGuard(rehearsal, authorization, backup, plan);
 assert.strictEqual(r.releaseGate.mayExecuteMigration, false);
 assert.strictEqual(r.releaseGate.mayTargetProduction, false);
});
console.log(`Phase 130 contract tests: ${passed}/18 passed`);
