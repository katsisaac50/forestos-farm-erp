#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { evaluate } = require('./phase134-incident-response-rollback-decision');
const incident = {
  incidentId: 'INC-134-001', changeTicket: 'CHG-134-EXAMPLE',
  reportedAt: '2026-10-27T12:00:00Z', incidentCommander: 'on-call-lead',
  serviceOwner: 'inventory-owner', rollbackOwner: 'platform-owner',
  customerImpact: 'Intermittent elevated latency', severity: 'SEV3',
  tenantDataExposure: false, dataLossSuspected: false, rollbackAlreadyStarted: false
};
const observations = [{ at: '2026-10-27T12:00:00Z', signal: 'p95LatencyMs', value: 260, note: 'Above baseline; investigate.' }];
const prior = { decision: 'REVIEW_REQUIRED' };
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('PASS ' + name); }
catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; } }
test('SEV3 recommends runbook and monitoring', () => {
  const r = evaluate({ incident, observations, priorVerification: prior });
  assert.strictEqual(r.recommendation, 'FOLLOW_RUNBOOK_AND_MONITOR');
  assert.strictEqual(r.decisionBoundary.rollbackExecuted, false);
});
test('SEV1 escalates immediately', () => {
  const r = evaluate({ incident: { ...incident, severity: 'SEV1' }, observations, priorVerification: prior });
  assert.strictEqual(r.recommendation, 'ESCALATE_IMMEDIATELY_AND_ASSESS_ROLLBACK');
});
test('tenant exposure triggers urgent escalation', () => {
  const r = evaluate({ incident: { ...incident, tenantDataExposure: true }, observations, priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'TENANT_DATA_EXPOSURE'));
  assert.strictEqual(r.recommendation, 'ESCALATE_IMMEDIATELY_AND_ASSESS_ROLLBACK');
});
test('suspected data loss triggers urgent escalation', () => {
  const r = evaluate({ incident: { ...incident, dataLossSuspected: true }, observations, priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'DATA_LOSS_SUSPECTED'));
});
test('non-zero tenant conflict blocks and escalates', () => {
  const r = evaluate({ incident, observations: [{ at: incident.reportedAt, signal: 'tenantConflictCount', value: 1 }], priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'INTEGRITY_SIGNAL_ACTIVE'));
  assert.strictEqual(r.recommendation, 'ESCALATE_IMMEDIATELY_AND_ASSESS_ROLLBACK');
});
test('duplicate code signal blocks and escalates', () => {
  const r = evaluate({ incident, observations: [{ at: incident.reportedAt, signal: 'duplicateCodeCount', value: 2 }], priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'INTEGRITY_SIGNAL_ACTIVE'));
});
test('missing incident record is blocker', () => {
  const r = evaluate({ incident: null, observations, priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'INCIDENT_RECORD_MISSING'));
});
test('missing observation is blocker', () => {
  const r = evaluate({ incident, observations: [], priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'OBSERVATIONS_MISSING'));
});
test('invalid severity is blocker', () => {
  const r = evaluate({ incident: { ...incident, severity: 'SEV0' }, observations, priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'INCIDENT_SEVERITY_INVALID'));
});
test('invalid observation timestamp is blocker', () => {
  const r = evaluate({ incident, observations: [{ at: 'bad', signal: 'health', value: true }], priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'OBSERVATION_TIMESTAMP_INVALID'));
});
test('missing prior verification is blocker', () => {
  const r = evaluate({ incident, observations, priorVerification: null });
  assert.ok(r.findings.some(f => f.code === 'PRIOR_VERIFICATION_MISSING'));
});
test('failed prior verification adds warning', () => {
  const r = evaluate({ incident, observations, priorVerification: { decision: 'POST_CHANGE_VERIFICATION_FAILED' } });
  assert.ok(r.findings.some(f => f.code === 'PRIOR_VERIFICATION_FAILED'));
});
test('rollback already started requires verification warning', () => {
  const r = evaluate({ incident: { ...incident, rollbackAlreadyStarted: true }, observations, priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'ROLLBACK_ALREADY_STARTED'));
});
test('rollback is never automatically authorized', () => {
  const r = evaluate({ incident, observations, priorVerification: prior });
  assert.strictEqual(r.decisionBoundary.rollbackAuthorized, false);
  assert.strictEqual(r.decisionBoundary.requiresSeparateChangeAuthorityForRollback, true);
});
test('timeline preserves supplied observations', () => {
  const r = evaluate({ incident, observations, priorVerification: prior });
  assert.strictEqual(r.responseTimeline.length, 1);
  assert.strictEqual(r.responseTimeline[0].signal, 'p95LatencyMs');
});
test('missing incident commander is blocker', () => {
  const r = evaluate({ incident: { ...incident, incidentCommander: '' }, observations, priorVerification: prior });
  assert.ok(r.findings.some(f => f.code === 'INCIDENT_FIELD_MISSING' && f.evidence.field === 'incidentCommander'));
});
test('SEV2 recommends escalation to incident commander', () => {
  const r = evaluate({ incident: { ...incident, severity: 'SEV2' }, observations, priorVerification: prior });
  assert.strictEqual(r.recommendation, 'ESCALATE_TO_INCIDENT_COMMANDER_AND_ASSESS_ROLLBACK');
});
console.log(`${passed}/17 Phase 134 contract tests passed`);
