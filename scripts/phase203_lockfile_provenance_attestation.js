#!/usr/bin/env node
'use strict';
// Phase 203: verify a candidate lockfile against a provenance sidecar. This validates consistency, not signer identity.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'apps/api/package.json');
const reportPath = path.join(root, 'PHASE203_LOCKFILE_PROVENANCE_REPORT.json');
const args = process.argv.slice(2);
const getArg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const candidatePath = getArg('--candidate');
const attestationPath = getArg('--attestation');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => { try { return { ok: true, value: JSON.parse(fs.readFileSync(p, 'utf8')), bytes: fs.readFileSync(p) }; } catch (e) { return { ok: false, error: e.message }; } };
const report = { phase: 203, title: 'Lockfile Provenance Attestation Check', generatedAt: new Date().toISOString(), productionCleared: false, installExecuted: false, buildExecuted: false, networkAccessAttempted: false, status: 'BLOCKED_INPUTS_MISSING', checks: {}, evidence: {}, blockers: [], nextActions: [] };
const required = ['manifestSha256', 'lockfileSha256', 'packageName', 'packageVersion', 'lockfileVersion', 'generatedAt', 'nodeVersion', 'npmVersion', 'registry', 'gitCommit', 'command'];
try {
 const m = read(manifestPath); report.checks.manifestValid = m.ok && !!(m.value.name && m.value.version); if (!report.checks.manifestValid) throw new Error('API manifest is missing or invalid.');
 report.evidence.manifest = { path: 'apps/api/package.json', name: m.value.name, version: m.value.version, sha256: hash(m.bytes) };
 if (!candidatePath || !attestationPath) {
  report.blockers.push('Provide both --candidate <package-lock.json> and --attestation <provenance.json>.');
  report.nextActions.push('Generate a lockfile on a trusted registry-enabled machine and create a provenance sidecar using PHASE203_PROVENANCE_TEMPLATE.json.');
 } else {
  const c = read(path.resolve(candidatePath)); const a = read(path.resolve(attestationPath));
  report.checks.candidateExists = c.ok; report.checks.attestationExistsAndValidJson = a.ok;
  if (c.ok) report.evidence.candidate = { path: path.resolve(candidatePath), sha256: hash(c.bytes), lockfileVersion: c.value.lockfileVersion, packageName: c.value.packages?.['']?.name || null, packageVersion: c.value.packages?.['']?.version || null };
  if (!c.ok) report.blockers.push('Candidate lockfile could not be read as valid JSON: ' + c.error);
  if (!a.ok) report.blockers.push('Attestation could not be read as valid JSON: ' + a.error);
  if (a.ok) {
   report.evidence.attestation = { path: path.resolve(attestationPath), sha256: hash(a.bytes) };
   const v = a.value; report.checks.attestationFieldsPresent = required.every(k => typeof v[k] === 'string' && v[k].trim().length > 0);
   report.checks.manifestFingerprintMatches = v.manifestSha256 === report.evidence.manifest.sha256;
   report.checks.lockfileFingerprintMatches = c.ok && v.lockfileSha256 === hash(c.bytes);
   report.checks.packageIdentityMatches = c.ok && v.packageName === m.value.name && v.packageVersion === m.value.version && c.value.packages?.['']?.name === m.value.name && c.value.packages?.['']?.version === m.value.version;
   report.checks.lockfileVersionMatches = c.ok && [2,3].includes(c.value.lockfileVersion) && String(c.value.lockfileVersion) === v.lockfileVersion;
   report.checks.rootDependenciesMatch = c.ok && JSON.stringify(c.value.packages?.['']?.dependencies || {}) === JSON.stringify(m.value.dependencies || {}) && JSON.stringify(c.value.packages?.['']?.devDependencies || {}) === JSON.stringify(m.value.devDependencies || {});
  }
  const checks = ['attestationFieldsPresent','manifestFingerprintMatches','lockfileFingerprintMatches','packageIdentityMatches','lockfileVersionMatches','rootDependenciesMatch'];
  if (c.ok && a.ok && checks.every(k => report.checks[k] === true)) { report.status = 'CONSISTENT_ATTESTATION_PROVENANCE_STILL_REQUIRES_INDEPENDENT_TRUST'; report.nextActions.push('Verify Git commit or CI artifact origin independently; this unsigned sidecar is not cryptographic proof of provenance.'); report.nextActions.push('After independent review, place the candidate in a clean working copy and run the Phase 201 install/build gate.'); }
  else { report.status = 'REJECTED_CANDIDATE_OR_ATTESTATION'; for (const k of checks) if (report.checks[k] !== true) report.blockers.push('Attestation check failed: ' + k); }
 }
} catch (e) { report.status = 'BLOCKED_CHECK_ERROR'; report.blockers.push(e.message); }
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status === 'REJECTED_CANDIDATE_OR_ATTESTATION' || report.status === 'BLOCKED_CHECK_ERROR') process.exitCode = 2;
