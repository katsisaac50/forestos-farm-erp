#!/usr/bin/env node
'use strict';
// Phase 200: aggregate build/release evidence without changing build state.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const reportPath = path.join(root, 'PHASE200_RELEASE_EVIDENCE_BUNDLE.json');
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const readJson = (p) => { try { return { ok: true, value: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (e) { return { ok: false, error: e.message }; } };
const evidenceFiles = [
  ['phase193', 'PHASE193_LOCKFILE_RECOVERY_REPORT.json'],
  ['phase195', 'PHASE195_REGISTRY_LOCKFILE_RECOVERY_REPORT.json'],
  ['phase196', 'PHASE196_LOCAL_LOCKFILE_RECOVERY_REPORT.json'],
  ['phase197', 'PHASE197_TRUSTED_LOCKFILE_PROVENANCE_REPORT.json'],
  ['phase198', 'PHASE198_TRUSTED_LOCKFILE_INTAKE_REPORT.json'],
  ['phase199', 'PHASE199_BUILD_EVIDENCE_REPORT.json']
];
const report = {
  phase: 200,
  title: 'Trusted Dependency Recovery & Release Evidence Bundle',
  generatedAt: new Date().toISOString(),
  mode: 'read-only-evidence-aggregation',
  productionCleared: false,
  buildExecutedByThisTool: false,
  status: 'INITIALIZING',
  checks: {},
  evidence: {},
  blockers: [],
  nextActions: []
};
try {
  const manifestPath = path.join(api, 'package.json');
  const manifest = readJson(manifestPath);
  report.checks.apiManifestValid = manifest.ok && Boolean(manifest.value.name && manifest.value.version && manifest.value.scripts && manifest.value.scripts.build);
  if (manifest.ok) report.evidence.apiManifest = { path: 'apps/api/package.json', name: manifest.value.name, version: manifest.value.version, sha256: hash(manifestPath) };
  else report.blockers.push('API manifest could not be parsed: ' + manifest.error);

  const lockPath = path.join(api, 'package-lock.json');
  report.checks.apiLockfileExists = fs.existsSync(lockPath);
  report.checks.apiLockfileAligned = false;
  if (report.checks.apiLockfileExists && manifest.ok) {
    const lock = readJson(lockPath);
    const rootPackage = lock.ok && lock.value.packages && lock.value.packages[''];
    report.checks.apiLockfileAligned = Boolean(rootPackage && rootPackage.name === manifest.value.name && rootPackage.version === manifest.value.version && JSON.stringify(rootPackage.dependencies || {}) === JSON.stringify(manifest.value.dependencies || {}) && JSON.stringify(rootPackage.devDependencies || {}) === JSON.stringify(manifest.value.devDependencies || {}));
    report.evidence.apiLockfile = lock.ok ? { path: 'apps/api/package-lock.json', sha256: hash(lockPath), lockfileVersion: lock.value.lockfileVersion, aligned: report.checks.apiLockfileAligned } : { path: 'apps/api/package-lock.json', parseError: lock.error };
  }
  if (!report.checks.apiLockfileExists) report.blockers.push('apps/api/package-lock.json is missing; reproducible npm ci is not yet possible.');
  else if (!report.checks.apiLockfileAligned) report.blockers.push('API lockfile is invalid or does not align with the API manifest.');

  report.evidence.historicalReports = {};
  for (const [key, name] of evidenceFiles) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) { report.evidence.historicalReports[key] = { path: name, present: false }; continue; }
    const parsed = readJson(p);
    report.evidence.historicalReports[key] = parsed.ok ? { path: name, present: true, parseable: true, sha256: hash(p), phase: parsed.value.phase ?? null, status: parsed.value.status ?? parsed.value.outcome ?? null } : { path: name, present: true, parseable: false, error: parsed.error };
  }

  const node = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', timeout: 3000 });
  const npm = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 3000 });
  report.evidence.runtime = { node: node.status === 0 ? node.stdout.trim() : null, npm: npm.status === 0 ? npm.stdout.trim() : null, apiNodeModulesExists: fs.existsSync(path.join(api, 'node_modules')), nestCliExists: fs.existsSync(path.join(api, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js')) };
  report.checks.buildPrerequisitesPresent = report.checks.apiManifestValid && report.checks.apiLockfileAligned && report.evidence.runtime.apiNodeModulesExists && report.evidence.runtime.nestCliExists;
  if (!report.evidence.runtime.apiNodeModulesExists || !report.evidence.runtime.nestCliExists) report.blockers.push('API dependencies and/or the local NestJS CLI are not installed.');

  const knownBadJson = path.join(root, 'PHASE125_SCHEMA_INDEX_READINESS.json');
  if (fs.existsSync(knownBadJson)) {
    const parsed = readJson(knownBadJson);
    report.checks.legacyPhase125JsonValid = parsed.ok;
    if (!parsed.ok) report.blockers.push('Pre-existing PHASE125_SCHEMA_INDEX_READINESS.json is invalid JSON; review and repair separately.');
  } else report.checks.legacyPhase125JsonValid = null;

  report.checks.releaseEvidenceComplete = report.checks.buildPrerequisitesPresent;
  if (!report.checks.apiManifestValid) report.nextActions.push('Repair and validate apps/api/package.json.');
  if (!report.checks.apiLockfileExists) report.nextActions.push('Obtain package-lock.json from a trusted Git/CI source or generate it in a registry-enabled environment; verify provenance and alignment.');
  else if (!report.checks.apiLockfileAligned) report.nextActions.push('Inspect and correct lockfile/manifest alignment before installation.');
  if (!report.evidence.runtime.apiNodeModulesExists || !report.evidence.runtime.nestCliExists) report.nextActions.push('After lockfile verification, run npm ci in apps/api and record the real result.');
  report.nextActions.push('Run npm run build in apps/api and preserve the compiler output; then perform runtime, database, authentication, and security tests.');
  report.nextActions.push('Keep production clearance disabled until all release criteria are independently verified.');
  report.status = report.checks.releaseEvidenceComplete ? 'READY_FOR_EXPLICIT_BUILD_NOT_PRODUCTION_CLEARED' : 'BLOCKED_DEPENDENCY_OR_BUILD_PREREQUISITES';
} catch (e) {
  report.status = 'BLOCKED_EVIDENCE_COLLECTION_ERROR';
  report.blockers.push(e.message);
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status.startsWith('BLOCKED')) process.exitCode = 2;
