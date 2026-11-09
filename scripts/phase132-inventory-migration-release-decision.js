#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 132 — Inventory Migration Release Decision & Evidence Pack
 *
 * Offline evidence evaluator only. It does not connect to MongoDB, perform
 * migration writes, or authorize production execution.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function addFinding(findings, severity, code, message, evidence = null) {
  findings.push({ severity, code, message, evidence });
}
function validateEvidence(evidence, findings) {
  if (!isObject(evidence)) {
    addFinding(findings, 'BLOCKER', 'EVIDENCE_NOT_OBJECT', 'Evidence pack must be a JSON object.');
    return;
  }
  const requiredBooleans = [
    ['preflightPassed', 'PREFLIGHT_NOT_PASSED'],
    ['rehearsalPassed', 'REHEARSAL_NOT_PASSED'],
    ['backupVerified', 'BACKUP_NOT_VERIFIED'],
    ['restoreTestPassed', 'RESTORE_TEST_NOT_PASSED'],
    ['indexReviewPassed', 'INDEX_REVIEW_NOT_PASSED'],
    ['duplicateKeyReviewPassed', 'DUPLICATE_KEY_REVIEW_NOT_PASSED'],
    ['independentReviewerApproved', 'INDEPENDENT_REVIEW_MISSING']
  ];
  for (const [field, code] of requiredBooleans) {
    if (evidence[field] !== true) {
      addFinding(findings, 'BLOCKER', code, `Required evidence flag "${field}" must be true.`);
    }
  }
  for (const field of ['changeTicket', 'backupEvidenceRef', 'restoreEvidenceRef', 'reviewer', 'reviewedAt']) {
    if (typeof evidence[field] !== 'string' || !evidence[field].trim()) {
      addFinding(findings, 'BLOCKER', 'EVIDENCE_REFERENCE_MISSING', `Required evidence reference "${field}" is missing or blank.`, { field });
    }
  }
  if (typeof evidence.reviewedAt === 'string' && evidence.reviewedAt.trim()) {
    const t = Date.parse(evidence.reviewedAt);
    if (!Number.isFinite(t)) {
      addFinding(findings, 'BLOCKER', 'REVIEW_TIMESTAMP_INVALID', 'reviewedAt must be a parseable date/time.');
    }
  }
  if (evidence.environment === 'production') {
    addFinding(findings, 'BLOCKER', 'PRODUCTION_EVIDENCE_ONLY', 'This offline evaluator cannot approve production migration execution.');
  }
  if (evidence.mutationEnabled === true) {
    addFinding(findings, 'BLOCKER', 'MUTATION_FLAG_FORBIDDEN', 'Evidence pack must not enable mutation.');
  }
}
function evaluate({ evidence, reconciliation, inputHashes = {} }) {
  const findings = [];
  validateEvidence(evidence, findings);
  if (!isObject(reconciliation)) {
    addFinding(findings, 'BLOCKER', 'RECONCILIATION_MISSING', 'A Phase 131 reconciliation report is required.');
  } else {
    const gate = reconciliation.releaseGate || {};
    if (gate.reconciliationPassed !== true) {
      addFinding(findings, 'BLOCKER', 'RECONCILIATION_NOT_PASSED', 'Phase 131 reconciliation gate is not passed.');
    }
    if (gate.migrationAuthorized !== false) {
      addFinding(findings, 'BLOCKER', 'UNEXPECTED_MIGRATION_AUTHORIZATION', 'Phase 131 report must preserve migrationAuthorized:false.');
    }
    if (gate.rollbackAutomaticallyAuthorized !== false) {
      addFinding(findings, 'BLOCKER', 'UNEXPECTED_AUTO_ROLLBACK_AUTHORIZATION', 'Automatic rollback must remain unauthorized.');
    }
  }
  const blockers = findings.filter(f => f.severity === 'BLOCKER').length;
  const warnings = findings.filter(f => f.severity === 'WARNING').length;
  return {
    schemaVersion: 1,
    phase: 132,
    generatedAt: new Date().toISOString(),
    decision: blockers === 0 ? 'CONDITIONAL_GO_FOR_SEPARATE_CHANGE_AUTHORITY_REVIEW' : 'NO_GO',
    summary: { blockers, warnings, findingCount: findings.length },
    findings,
    evidenceReferences: {
      changeTicket: evidence && evidence.changeTicket || null,
      backupEvidenceRef: evidence && evidence.backupEvidenceRef || null,
      restoreEvidenceRef: evidence && evidence.restoreEvidenceRef || null,
      reviewer: evidence && evidence.reviewer || null,
      reviewedAt: evidence && evidence.reviewedAt || null
    },
    inputHashes,
    explicitLimitations: [
      'This tool evaluates supplied JSON evidence; it does not verify that evidence references are authentic or accessible.',
      'A non-NO-GO result is not migration authorization and is not a production approval.',
      'No database connection, migration write, index change, or rollback is performed.',
      'A qualified operator must independently validate backup restoration, application compatibility, tenant ownership, unique indexes, duplicate keys, monitoring, and rollback steps.'
    ],
    releaseGate: {
      mayExecuteMigration: false,
      mayTargetProduction: false,
      requiresSeparateChangeAuthority: true,
      automaticRollbackAuthorized: false
    }
  };
}
function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const evidencePath = get('--evidence');
  const reconciliationPath = get('--reconciliation');
  const outPath = get('--out') || 'phase132-release-decision.json';
  if (!evidencePath || !reconciliationPath) {
    console.error('Usage: node phase132-inventory-migration-release-decision.js --evidence evidence.json --reconciliation phase131-reconciliation-report.json [--out report.json]');
    process.exitCode = 2;
    return;
  }
  try {
    const evidence = readJson(evidencePath);
    const reconciliation = readJson(reconciliationPath);
    const report = evaluate({
      evidence,
      reconciliation,
      inputHashes: {
        evidenceSha256: sha256(evidencePath),
        reconciliationSha256: sha256(reconciliationPath)
      }
    });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ decision: report.decision, summary: report.summary, output: path.resolve(outPath) }, null, 2));
    if (report.decision === 'NO_GO') process.exitCode = 1;
  } catch (error) {
    console.error(`Phase 132 failed: ${error.message}`);
    process.exitCode = 2;
  }
}
if (require.main === module) main();
module.exports = { evaluate };
