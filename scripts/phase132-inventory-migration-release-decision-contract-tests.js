#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { evaluate } = require('./phase132-inventory-migration-release-decision');

const goodEvidence = {
  environment: 'staging',
  mutationEnabled: false,
  preflightPassed: true,
  rehearsalPassed: true,
  backupVerified: true,
  restoreTestPassed: true,
  indexReviewPassed: true,
  duplicateKeyReviewPassed: true,
  independentReviewerApproved: true,
  changeTicket: 'CHG-132-EXAMPLE',
  backupEvidenceRef: 'evidence://backup/restore-point',
  restoreEvidenceRef: 'evidence://restore-test/run',
  reviewer: 'independent-reviewer',
  reviewedAt: '2026-10-27T10:00:00Z'
};
const goodReconciliation = {
  releaseGate: {
    reconciliationPassed: true,
    migrationAuthorized: false,
    rollbackAutomaticallyAuthorized: false
  }
};
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}
test('complete evidence is only conditional go for separate authority review', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: goodReconciliation });
  assert.strictEqual(r.decision, 'CONDITIONAL_GO_FOR_SEPARATE_CHANGE_AUTHORITY_REVIEW');
  assert.strictEqual(r.releaseGate.mayExecuteMigration, false);
});
test('missing evidence produces NO_GO', () => {
  const r = evaluate({ evidence: {}, reconciliation: goodReconciliation });
  assert.strictEqual(r.decision, 'NO_GO');
  assert.ok(r.summary.blockers > 0);
});
test('reconciliation failure produces NO_GO', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: { releaseGate: { reconciliationPassed: false, migrationAuthorized: false, rollbackAutomaticallyAuthorized: false } } });
  assert.strictEqual(r.decision, 'NO_GO');
  assert.ok(r.findings.some(f => f.code === 'RECONCILIATION_NOT_PASSED'));
});
test('missing reconciliation report produces NO_GO', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: null });
  assert.strictEqual(r.decision, 'NO_GO');
});
test('migration authorization true is rejected', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: { releaseGate: { reconciliationPassed: true, migrationAuthorized: true, rollbackAutomaticallyAuthorized: false } } });
  assert.ok(r.findings.some(f => f.code === 'UNEXPECTED_MIGRATION_AUTHORIZATION'));
});
test('automatic rollback authorization true is rejected', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: { releaseGate: { reconciliationPassed: true, migrationAuthorized: false, rollbackAutomaticallyAuthorized: true } } });
  assert.ok(r.findings.some(f => f.code === 'UNEXPECTED_AUTO_ROLLBACK_AUTHORIZATION'));
});
test('production environment is always blocked', () => {
  const r = evaluate({ evidence: { ...goodEvidence, environment: 'production' }, reconciliation: goodReconciliation });
  assert.ok(r.findings.some(f => f.code === 'PRODUCTION_EVIDENCE_ONLY'));
  assert.strictEqual(r.decision, 'NO_GO');
});
test('mutation enabled is blocked', () => {
  const r = evaluate({ evidence: { ...goodEvidence, mutationEnabled: true }, reconciliation: goodReconciliation });
  assert.ok(r.findings.some(f => f.code === 'MUTATION_FLAG_FORBIDDEN'));
});
test('unparseable review timestamp is blocked', () => {
  const r = evaluate({ evidence: { ...goodEvidence, reviewedAt: 'yesterday-ish' }, reconciliation: goodReconciliation });
  assert.ok(r.findings.some(f => f.code === 'REVIEW_TIMESTAMP_INVALID'));
});
test('blank backup reference is blocked', () => {
  const r = evaluate({ evidence: { ...goodEvidence, backupEvidenceRef: '  ' }, reconciliation: goodReconciliation });
  assert.ok(r.findings.some(f => f.code === 'EVIDENCE_REFERENCE_MISSING'));
});
test('missing independent reviewer approval is blocked', () => {
  const r = evaluate({ evidence: { ...goodEvidence, independentReviewerApproved: false }, reconciliation: goodReconciliation });
  assert.ok(r.findings.some(f => f.code === 'INDEPENDENT_REVIEW_MISSING'));
});
test('always declares separate authority required', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: goodReconciliation });
  assert.strictEqual(r.releaseGate.requiresSeparateChangeAuthority, true);
  assert.strictEqual(r.releaseGate.mayTargetProduction, false);
});
test('input hashes are preserved in report', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: goodReconciliation, inputHashes: { evidenceSha256: 'abc' } });
  assert.strictEqual(r.inputHashes.evidenceSha256, 'abc');
});
test('non-object evidence is blocked', () => {
  const r = evaluate({ evidence: null, reconciliation: goodReconciliation });
  assert.ok(r.findings.some(f => f.code === 'EVIDENCE_NOT_OBJECT'));
});
test('non-object reconciliation is blocked', () => {
  const r = evaluate({ evidence: goodEvidence, reconciliation: 'bad' });
  assert.ok(r.findings.some(f => f.code === 'RECONCILIATION_MISSING'));
});
console.log(`${passed}/15 Phase 132 contract tests passed`);
