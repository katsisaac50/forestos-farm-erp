#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 134 — Incident response and rollback decision framework.
 * Offline evaluator only. It does not page responders, change infrastructure,
 * roll back data, or execute production actions.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function add(list, severity, code, message, evidence = null) { list.push({ severity, code, message, evidence }); }

const SEVERITY_RANK = { SEV1: 1, SEV2: 2, SEV3: 3, SEV4: 4 };
function evaluate({ incident, observations, priorVerification, inputHashes = {} }) {
  const findings = [];
  if (!isObject(incident)) {
    add(findings, 'BLOCKER', 'INCIDENT_RECORD_MISSING', 'An incident record object is required.');
  } else {
    for (const f of ['incidentId', 'changeTicket', 'reportedAt', 'incidentCommander', 'serviceOwner', 'rollbackOwner', 'customerImpact']) {
      if (typeof incident[f] !== 'string' || !incident[f].trim()) {
        add(findings, 'BLOCKER', 'INCIDENT_FIELD_MISSING', `Required incident field "${f}" is missing or blank.`, { field: f });
      }
    }
    if (incident.reportedAt && !Number.isFinite(Date.parse(incident.reportedAt))) {
      add(findings, 'BLOCKER', 'INCIDENT_TIMESTAMP_INVALID', 'reportedAt must be a parseable date/time.');
    }
    if (!Object.prototype.hasOwnProperty.call(SEVERITY_RANK, incident.severity)) {
      add(findings, 'BLOCKER', 'INCIDENT_SEVERITY_INVALID', 'severity must be SEV1, SEV2, SEV3, or SEV4.');
    }
    if (incident.tenantDataExposure === true) {
      add(findings, 'BLOCKER', 'TENANT_DATA_EXPOSURE', 'Potential cross-tenant data exposure requires immediate security incident handling and escalation.');
    }
    if (incident.dataLossSuspected === true) {
      add(findings, 'BLOCKER', 'DATA_LOSS_SUSPECTED', 'Suspected data loss requires preservation of evidence and senior technical review.');
    }
  }
  if (!Array.isArray(observations) || observations.length === 0) {
    add(findings, 'BLOCKER', 'OBSERVATIONS_MISSING', 'At least one time-stamped observation is required.');
  } else {
    observations.forEach((o, i) => {
      if (!isObject(o)) {
        add(findings, 'BLOCKER', 'OBSERVATION_INVALID', `Observation ${i} must be an object.`);
        return;
      }
      if (typeof o.at !== 'string' || !Number.isFinite(Date.parse(o.at))) {
        add(findings, 'BLOCKER', 'OBSERVATION_TIMESTAMP_INVALID', `Observation ${i} needs a valid timestamp.`);
      }
      if (typeof o.signal !== 'string' || !o.signal.trim()) {
        add(findings, 'BLOCKER', 'OBSERVATION_SIGNAL_MISSING', `Observation ${i} needs a signal description.`);
      }
      if (typeof o.value !== 'string' && typeof o.value !== 'number' && typeof o.value !== 'boolean') {
        add(findings, 'BLOCKER', 'OBSERVATION_VALUE_INVALID', `Observation ${i} value must be a string, number, or boolean.`);
      }
    });
  }
  if (!isObject(priorVerification)) {
    add(findings, 'BLOCKER', 'PRIOR_VERIFICATION_MISSING', 'Phase 133 verification report is required.');
  } else if (priorVerification.decision === 'POST_CHANGE_VERIFICATION_FAILED') {
    add(findings, 'WARNING', 'PRIOR_VERIFICATION_FAILED', 'Prior verification failed; treat incident as unresolved until evidence confirms recovery.');
  }

  const sev = incident && incident.severity;
  const urgent = sev === 'SEV1' || (incident && (incident.tenantDataExposure === true || incident.dataLossSuspected === true));
  const integritySignals = observations && Array.isArray(observations) && observations.some(o =>
    o && typeof o === 'object' && ['tenantConflictCount', 'duplicateCodeCount', 'unassignedItemCount', 'unassignedMovementCount'].includes(o.signal) &&
    typeof o.value === 'number' && o.value > 0
  );
  if (integritySignals) {
    add(findings, 'BLOCKER', 'INTEGRITY_SIGNAL_ACTIVE', 'An inventory or tenant-integrity signal is non-zero; preserve evidence and obtain an independent review before deciding recovery actions.');
  }

  let recommendation = 'INVESTIGATE_AND_CONTINUE_MONITORING';
  if (urgent || integritySignals) recommendation = 'ESCALATE_IMMEDIATELY_AND_ASSESS_ROLLBACK';
  else if (sev === 'SEV2') recommendation = 'ESCALATE_TO_INCIDENT_COMMANDER_AND_ASSESS_ROLLBACK';
  else if (sev === 'SEV3' || sev === 'SEV4') recommendation = 'FOLLOW_RUNBOOK_AND_MONITOR';
  if (incident && incident.rollbackAlreadyStarted === true) {
    add(findings, 'WARNING', 'ROLLBACK_ALREADY_STARTED', 'Rollback is reported as already started; verify authorization, scope, progress, and data consistency.');
  }
  const blockers = findings.filter(x => x.severity === 'BLOCKER').length;
  const warnings = findings.filter(x => x.severity === 'WARNING').length;
  return {
    schemaVersion: 1,
    phase: 134,
    generatedAt: new Date().toISOString(),
    incidentId: incident && incident.incidentId || null,
    severity: sev || null,
    recommendation,
    summary: { blockers, warnings, findingCount: findings.length },
    findings,
    responseTimeline: (Array.isArray(observations) ? observations : []).map(o => ({
      at: o && o.at || null, signal: o && o.signal || null, value: o && o.value !== undefined ? o.value : null, note: o && o.note || null
    })),
    requiredActions: [
      'Assign incident commander and record decision timestamps.',
      'Preserve logs, metrics, database snapshots and reconciliation evidence according to retention policy.',
      'Stop further risky changes while impact and scope are assessed.',
      'For possible tenant exposure or data loss, invoke the security/data incident process immediately.',
      'Assess rollback only against an approved runbook, verified restore point, data consistency checks and change authority.',
      'After containment, reconcile inventory and movement records and complete a post-incident review.'
    ],
    inputHashes,
    decisionBoundary: {
      rollbackExecuted: false,
      rollbackAuthorized: false,
      productionActionTaken: false,
      requiresHumanIncidentCommand: true,
      requiresSeparateChangeAuthorityForRollback: true
    },
    limitations: [
      'This tool evaluates supplied evidence only; it does not monitor systems, send notifications, or validate source authenticity.',
      'A recommendation is not a command to roll back. Rollback may cause additional data loss if the restore point or forward changes are not reconciled.',
      'Follow organizational security, privacy, continuity and incident-management procedures.'
    ]
  };
}
function main() {
  const args = process.argv.slice(2);
  const get = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const incidentPath = get('--incident'), observationsPath = get('--observations'), verificationPath = get('--prior-verification');
  const outPath = get('--out') || 'phase134-incident-response.json';
  if (![incidentPath, observationsPath, verificationPath].every(Boolean)) {
    console.error('Usage: node phase134-incident-response.js --incident incident.json --observations observations.json --prior-verification phase133-report.json [--out report.json]');
    process.exitCode = 2; return;
  }
  try {
    const report = evaluate({
      incident: readJson(incidentPath),
      observations: readJson(observationsPath),
      priorVerification: readJson(verificationPath),
      inputHashes: {
        incidentSha256: sha256(incidentPath),
        observationsSha256: sha256(observationsPath),
        priorVerificationSha256: sha256(verificationPath)
      }
    });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ recommendation: report.recommendation, summary: report.summary, output: path.resolve(outPath) }, null, 2));
    if (report.summary.blockers > 0) process.exitCode = 1;
  } catch (e) {
    console.error(`Phase 134 failed: ${e.message}`);
    process.exitCode = 2;
  }
}
if (require.main === module) main();
module.exports = { evaluate };
