#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 133 — Post-change verification & operational monitoring.
 * Offline evaluator: no DB connection, writes, or live monitoring.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function isObject(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function finding(list, severity, code, message, evidence = null) {
  list.push({ severity, code, message, evidence });
}
function evaluate({ checklist, baseline, postChange, releaseDecision, inputHashes = {} }) {
  const findings = [];
  if (!isObject(checklist)) {
    finding(findings, 'BLOCKER', 'CHECKLIST_MISSING', 'A post-change checklist JSON object is required.');
  } else {
    const required = [
      ['changeTicket', 'CHANGE_TICKET_MISSING'],
      ['operator', 'OPERATOR_MISSING'],
      ['verifiedAt', 'VERIFICATION_TIMESTAMP_MISSING'],
      ['monitoringWindow', 'MONITORING_WINDOW_MISSING'],
      ['rollbackOwner', 'ROLLBACK_OWNER_MISSING']
    ];
    for (const [field, code] of required) {
      if (typeof checklist[field] !== 'string' || !checklist[field].trim()) {
        finding(findings, 'BLOCKER', code, `Required field "${field}" is missing or blank.`, { field });
      }
    }
    if (checklist.verifiedAt && !Number.isFinite(Date.parse(checklist.verifiedAt))) {
      finding(findings, 'BLOCKER', 'VERIFICATION_TIMESTAMP_INVALID', 'verifiedAt must be a parseable date/time.');
    }
    const checks = [
      'applicationHealthConfirmed',
      'tenantIsolationSmokeTestsPassed',
      'inventoryCountsCompared',
      'movementLedgerReviewed',
      'errorRateWithinThreshold',
      'latencyWithinThreshold',
      'alertsReviewed',
      'backupStillAvailable',
      'rollbackPlanReady',
      'businessOwnerSignoff'
    ];
    for (const field of checks) {
      if (checklist[field] !== true) {
        finding(findings, 'BLOCKER', 'CHECK_NOT_PASSED', `Post-change check "${field}" must be true.`, { field });
      }
    }
    if (checklist.productionExecuted === true && checklist.changeAuthorityApproval !== true) {
      finding(findings, 'BLOCKER', 'CHANGE_AUTHORITY_APPROVAL_MISSING', 'Production execution is reported without separate change-authority approval evidence.');
    }
    if (checklist.rollbackTriggered === true) {
      finding(findings, 'WARNING', 'ROLLBACK_REPORTED', 'Rollback is reported as triggered; independently verify the rollback outcome and incident record.');
    }
  }
  if (!isObject(baseline) || !isObject(postChange)) {
    finding(findings, 'BLOCKER', 'METRICS_MISSING', 'Baseline and post-change metrics objects are both required.');
  } else {
    const metrics = ['stockItemCount', 'stockMovementCount', 'unassignedItemCount', 'unassignedMovementCount', 'tenantConflictCount', 'duplicateCodeCount', 'errorRatePercent', 'p95LatencyMs'];
    for (const key of metrics) {
      const a = baseline[key], b = postChange[key];
      if (typeof a !== 'number' || !Number.isFinite(a) || typeof b !== 'number' || !Number.isFinite(b)) {
        finding(findings, 'BLOCKER', 'METRIC_INVALID', `Metric "${key}" must be a finite number in baseline and post-change records.`, { metric: key });
      } else if (key === 'tenantConflictCount' || key === 'duplicateCodeCount' || key === 'unassignedItemCount' || key === 'unassignedMovementCount') {
        if (b > a) finding(findings, 'BLOCKER', 'INTEGRITY_METRIC_REGRESSION', `Metric "${key}" increased after change.`, { metric: key, before: a, after: b });
      } else if (key === 'errorRatePercent' || key === 'p95LatencyMs') {
        if (b > a) finding(findings, 'WARNING', 'PERFORMANCE_METRIC_REGRESSION', `Metric "${key}" increased after change; compare with approved thresholds.`, { metric: key, before: a, after: b });
      } else if (key === 'stockItemCount' || key === 'stockMovementCount') {
        if (b !== a) finding(findings, 'WARNING', 'COUNT_DELTA_REQUIRES_EXPLANATION', `Metric "${key}" changed; reconcile against approved business activity.`, { metric: key, before: a, after: b });
      }
    }
  }
  if (!isObject(releaseDecision)) {
    finding(findings, 'BLOCKER', 'RELEASE_DECISION_MISSING', 'Phase 132 release decision report is required.');
  } else {
    if (releaseDecision.decision === 'NO_GO') finding(findings, 'BLOCKER', 'PRIOR_RELEASE_NO_GO', 'Phase 132 release decision is NO_GO.');
    if (!releaseDecision.releaseGate || releaseDecision.releaseGate.requiresSeparateChangeAuthority !== true) {
      finding(findings, 'BLOCKER', 'CHANGE_AUTHORITY_GATE_MISSING', 'Phase 132 report must require separate change-authority review.');
    }
  }
  const blockers = findings.filter(x => x.severity === 'BLOCKER').length;
  const warnings = findings.filter(x => x.severity === 'WARNING').length;
  return {
    schemaVersion: 1,
    phase: 133,
    generatedAt: new Date().toISOString(),
    decision: blockers ? 'POST_CHANGE_VERIFICATION_FAILED' : warnings ? 'REVIEW_REQUIRED' : 'VERIFICATION_CHECKLIST_COMPLETE_PENDING_HUMAN_SIGNOFF',
    summary: { blockers, warnings, findingCount: findings.length },
    findings,
    evidence: {
      changeTicket: checklist && checklist.changeTicket || null,
      operator: checklist && checklist.operator || null,
      verifiedAt: checklist && checklist.verifiedAt || null,
      monitoringWindow: checklist && checklist.monitoringWindow || null,
      rollbackOwner: checklist && checklist.rollbackOwner || null
    },
    metrics: { baseline: baseline || null, postChange: postChange || null },
    inputHashes,
    releaseGate: {
      deploymentAuthorized: false,
      migrationAuthorized: false,
      productionHealthCertified: false,
      requiresHumanSignoff: true,
      automaticRollbackAuthorized: false
    },
    limitations: [
      'This offline evaluator only checks supplied records; it does not observe live service health or validate metric provenance.',
      'A complete checklist is not production certification and does not authorize deployment or migration.',
      'Count changes require business reconciliation; performance warnings require comparison with approved service-level objectives.',
      'A qualified operator must inspect logs, traces, database metrics, tenant isolation, backups, alerts, and business sign-off.'
    ]
  };
}
function main() {
  const args = process.argv.slice(2);
  const get = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const checklistPath = get('--checklist'), baselinePath = get('--baseline');
  const postPath = get('--post-change'), releasePath = get('--release-decision');
  const outPath = get('--out') || 'phase133-post-change-verification.json';
  if (![checklistPath, baselinePath, postPath, releasePath].every(Boolean)) {
    console.error('Usage: node phase133-post-change-verification.js --checklist checklist.json --baseline baseline.json --post-change post-change.json --release-decision phase132-release-decision.json [--out report.json]');
    process.exitCode = 2; return;
  }
  try {
    const report = evaluate({
      checklist: readJson(checklistPath),
      baseline: readJson(baselinePath),
      postChange: readJson(postPath),
      releaseDecision: readJson(releasePath),
      inputHashes: {
        checklistSha256: hash(checklistPath),
        baselineSha256: hash(baselinePath),
        postChangeSha256: hash(postPath),
        releaseDecisionSha256: hash(releasePath)
      }
    });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ decision: report.decision, summary: report.summary, output: path.resolve(outPath) }, null, 2));
    if (report.decision === 'POST_CHANGE_VERIFICATION_FAILED') process.exitCode = 1;
  } catch (err) {
    console.error(`Phase 133 failed: ${err.message}`);
    process.exitCode = 2;
  }
}
if (require.main === module) main();
module.exports = { evaluate };
