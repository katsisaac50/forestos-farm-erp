#!/usr/bin/env node
'use strict';

/**
 * Phase 130: execution authorization guard.
 * This is a pre-execution gate and plan validator only. It never connects to
 * MongoDB and never applies migration operations.
 *
 * Usage:
 * node scripts/phase130-inventory-migration-execution-guard.js <rehearsal-report.json> <authorization.json> <backup-evidence.json> <plan.json>
 */
const fs = require('fs');
const crypto = require('crypto');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function nonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function sha256(value) { return crypto.createHash('sha256').update(JSON.stringify(value, null, 2) + '\n').digest('hex'); }
function runGuard(rehearsal, authorization, backup, plan) {
  const findings = [];
  const add = (code, details = {}) => findings.push({ severity: 'BLOCKER', code, ...details });

  if (!rehearsal || rehearsal.phase !== 129) add('REHEARSAL_REPORT_PHASE_INVALID');
  if (!rehearsal || !rehearsal.releaseGate || rehearsal.releaseGate.rehearsalPassed !== true) add('REHEARSAL_NOT_PASSED');
  if (!rehearsal || !Array.isArray(rehearsal.findings) || rehearsal.findings.some(f => f.severity === 'BLOCKER')) add('REHEARSAL_HAS_BLOCKERS_OR_INVALID_FINDINGS');
  // Phase 129 intentionally leaves this false. The guard does not change that.
  if (!authorization || authorization.approvalStatus !== 'approved') add('EXPLICIT_APPROVAL_REQUIRED');
  if (!authorization || !nonEmpty(authorization.approvedBy)) add('APPROVER_ID_REQUIRED');
  if (!authorization || !nonEmpty(authorization.changeTicket)) add('CHANGE_TICKET_REQUIRED');
  if (!authorization || !nonEmpty(authorization.approvedAt) || Number.isNaN(Date.parse(authorization.approvedAt))) add('VALID_APPROVAL_TIMESTAMP_REQUIRED');
  if (!authorization || !nonEmpty(authorization.environment)) add('TARGET_ENVIRONMENT_REQUIRED');
  if (authorization && authorization.environment && /prod|production/i.test(authorization.environment)) add('PRODUCTION_EXECUTION_NOT_SUPPORTED_BY_THIS_GUARD');

  if (!backup || backup.backupStatus !== 'verified') add('VERIFIED_BACKUP_REQUIRED');
  if (!backup || !nonEmpty(backup.backupReference)) add('BACKUP_REFERENCE_REQUIRED');
  if (!backup || !nonEmpty(backup.verifiedBy)) add('BACKUP_VERIFIER_REQUIRED');
  if (!backup || !nonEmpty(backup.verifiedAt) || Number.isNaN(Date.parse(backup.verifiedAt))) add('VALID_BACKUP_VERIFICATION_TIMESTAMP_REQUIRED');
  if (!backup || backup.restoreTestStatus !== 'passed') add('RESTORE_TEST_MUST_PASS');
  if (!backup || !nonEmpty(backup.restoreEvidenceRef)) add('RESTORE_TEST_EVIDENCE_REQUIRED');

  if (!plan || plan.schemaVersion !== 1) add('PLAN_SCHEMA_VERSION_INVALID');
  if (!plan || plan.mode !== 'PLAN_ONLY') add('PLAN_ONLY_MODE_REQUIRED');
  if (!plan || plan.mutationEnabled !== false) add('MUTATION_MUST_BE_DISABLED');
  if (!plan || !Array.isArray(plan.operations)) add('PLAN_OPERATIONS_ARRAY_REQUIRED');
  const ops = plan && Array.isArray(plan.operations) ? plan.operations : [];
  const seen = new Set();
  for (const [index, op] of ops.entries()) {
    if (!op || !nonEmpty(op.recordType) || !nonEmpty(op.recordId) || op.field !== 'organizationId' || !nonEmpty(op.from) && op.from !== null || !nonEmpty(op.to)) {
      add('PLAN_OPERATION_INVALID', { index });
      continue;
    }
    const key = `${op.recordType}:${op.recordId}:${op.field}`;
    if (seen.has(key)) add('DUPLICATE_PLAN_OPERATION', { index, key });
    seen.add(key);
    if (!/^[a-fA-F0-9]{24}$/.test(op.to)) add('TARGET_ORGANIZATION_ID_INVALID', { index });
    if (op.recordType !== 'stockItem' && op.recordType !== 'stockMovement') add('UNSUPPORTED_RECORD_TYPE', { index });
  }

  const report = {
    phase: 130,
    title: 'Inventory Migration Execution Safeguards',
    mode: 'PRE_EXECUTION_GUARD_ONLY',
    generatedAt: new Date().toISOString(),
    inputHashes: {
      rehearsal: rehearsal ? sha256(rehearsal) : null,
      authorization: authorization ? sha256(authorization) : null,
      backup: backup ? sha256(backup) : null,
      plan: plan ? sha256(plan) : null
    },
    operationCount: ops.length,
    blockerCount: findings.length,
    findings,
    releaseGate: {
      guardPassed: findings.length === 0,
      mayExecuteMigration: false,
      mayTargetProduction: false,
      requiresIndependentReview: true,
      reason: 'This phase validates evidence and plan shape only. It has no database adapter and cannot execute writes.'
    }
  };
  return report;
}
function main(argv) {
  if (argv.length !== 4 || argv.includes('--help')) {
    console.error('Usage: node scripts/phase130-inventory-migration-execution-guard.js <rehearsal-report.json> <authorization.json> <backup-evidence.json> <plan.json>');
    process.exitCode = 2;
    return;
  }
  try {
    const report = runGuard(readJson(argv[0]), readJson(argv[1]), readJson(argv[2]), readJson(argv[3]));
    const outPath = 'phase130-execution-guard-report.json';
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ phase: 130, guardPassed: report.releaseGate.guardPassed, blockerCount: report.blockerCount, mayExecuteMigration: false, reportPath: outPath }, null, 2));
    if (!report.releaseGate.guardPassed) process.exitCode = 3;
  } catch (err) {
    console.error(`Phase 130 guard error: ${err.message}`);
    process.exitCode = 2;
  }
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { runGuard };
