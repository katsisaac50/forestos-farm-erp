#!/usr/bin/env node
'use strict';
// Phase 202: create a verifiable handoff for acquiring a genuine npm lockfile in a registry-enabled environment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const manifestPath = path.join(api, 'package.json');
const reportPath = path.join(root, 'PHASE202_LOCKFILE_ACQUISITION_REPORT.json');
const kitDir = path.join(root, 'artifacts', 'phase202-lockfile-acquisition');
const args = process.argv.slice(2);
const validateIndex = args.indexOf('--validate-candidate');
const candidate = validateIndex >= 0 ? args[validateIndex + 1] : null;
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const report = { phase: 202, title: 'Trusted Lockfile Acquisition Kit', generatedAt: new Date().toISOString(), productionCleared: false, networkAccessAttempted: false, installExecuted: false, buildExecuted: false, status: 'UNKNOWN', checks: {}, evidence: {}, blockers: [], nextActions: [] };
function parseJson(file) { try { return { ok: true, value: JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { return { ok: false, error: e.message }; } }
function aligned(lock, manifest) {
  const p = lock && lock.packages && lock.packages[''];
  return !!(p && p.name === manifest.name && p.version === manifest.version && JSON.stringify(p.dependencies || {}) === JSON.stringify(manifest.dependencies || {}) && JSON.stringify(p.devDependencies || {}) === JSON.stringify(manifest.devDependencies || {}));
}
try {
  const m = parseJson(manifestPath);
  report.checks.manifestValid = m.ok && !!(m.value.name && m.value.version && m.value.dependencies && m.value.devDependencies);
  if (!report.checks.manifestValid) throw new Error('API package.json is missing or invalid.');
  const manifestBytes = fs.readFileSync(manifestPath);
  report.evidence.manifest = { path: 'apps/api/package.json', name: m.value.name, version: m.value.version, sha256: sha256(manifestBytes), dependencyCount: Object.keys(m.value.dependencies || {}).length, devDependencyCount: Object.keys(m.value.devDependencies || {}).length };
  if (candidate) {
    const candidatePath = path.resolve(candidate);
    const parsed = parseJson(candidatePath);
    report.evidence.candidate = { path: candidatePath, sha256: fs.existsSync(candidatePath) ? sha256(fs.readFileSync(candidatePath)) : null };
    report.checks.candidateExists = fs.existsSync(candidatePath);
    report.checks.candidateJsonValid = parsed.ok;
    report.checks.candidateAligned = parsed.ok && aligned(parsed.value, m.value);
    report.checks.lockfileVersionSupported = parsed.ok && [2, 3].includes(parsed.value.lockfileVersion);
    report.status = report.checks.candidateExists && report.checks.candidateJsonValid && report.checks.candidateAligned && report.checks.lockfileVersionSupported ? 'CANDIDATE_ALIGNED_PROVENANCE_REQUIRES_INDEPENDENT_VERIFICATION' : 'CANDIDATE_REJECTED';
    if (!report.checks.candidateExists) report.blockers.push('Candidate lockfile does not exist.');
    if (!report.checks.candidateJsonValid) report.blockers.push('Candidate is not valid JSON.');
    if (parsed.ok && !report.checks.candidateAligned) report.blockers.push('Candidate root identity or dependency maps do not align with apps/api/package.json.');
    if (parsed.ok && !report.checks.lockfileVersionSupported) report.blockers.push('Candidate lockfileVersion must be 2 or 3.');
    report.nextActions.push('Independently verify candidate provenance from trusted Git history or CI artifact metadata before importing it.');
  } else {
    fs.mkdirSync(kitDir, { recursive: true });
    const snapshot = { package: m.value.name, version: m.value.version, manifestSha256: sha256(manifestBytes), packageJson: m.value };
    fs.writeFileSync(path.join(kitDir, 'API_PACKAGE_MANIFEST_SNAPSHOT.json'), JSON.stringify(snapshot, null, 2) + '\n');
    const instructions = `# Phase 202 — Trusted Lockfile Acquisition\n\nThis kit was generated for ${m.value.name}@${m.value.version}.\n\nManifest SHA-256: \`${sha256(manifestBytes)}\`\n\n## On a trusted machine with registry access\n\n1. Verify this manifest fingerprint against the original ForestOS package.\n2. Copy the exact \`apps/api/package.json\` into a clean working copy of the project.\n3. From \`apps/api\`, run:\n\n\`\`\`sh\nnpm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000\n\`\`\`\n\n4. Do not replace an existing lockfile. Review the generated \`package-lock.json\` and verify its root package identity and dependency maps against the manifest.\n5. Preserve npm version, command output, generation timestamp, registry identity, and Git commit in provenance evidence.\n6. Return the candidate lockfile and provenance evidence to ForestOS. Validate the candidate using:\n\n\`\`\`sh\nnode scripts/phase202_trusted_lockfile_acquisition_kit.js --validate-candidate /path/to/package-lock.json\n\`\`\`\n\nThis kit does not generate a lockfile in this environment, install packages, execute a build, or establish provenance by itself. Production remains not cleared.\n`;
    fs.writeFileSync(path.join(kitDir, 'README_ACQUISITION_STEPS.md'), instructions);
    report.evidence.handoff = { directory: 'artifacts/phase202-lockfile-acquisition', snapshot: 'artifacts/phase202-lockfile-acquisition/API_PACKAGE_MANIFEST_SNAPSHOT.json', instructions: 'artifacts/phase202-lockfile-acquisition/README_ACQUISITION_STEPS.md' };
    report.checks.lockfilePresent = fs.existsSync(path.join(api, 'package-lock.json'));
    report.status = report.checks.lockfilePresent ? 'EXISTING_LOCKFILE_REQUIRES_VALIDATION' : 'ACQUISITION_HANDOFF_READY_LOCKFILE_MISSING';
    if (!report.checks.lockfilePresent) report.blockers.push('No API package-lock.json is present in this workspace.');
    report.nextActions.push('Use the generated handoff in a registry-enabled environment or obtain the lockfile and provenance from trusted CI/version control.');
    report.nextActions.push('Validate the returned candidate, independently verify provenance, then use the Phase 201 install/build gate.');
  }
} catch (e) { report.status = 'BLOCKED_KIT_GENERATION'; report.blockers.push(e.message); }
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status === 'CANDIDATE_REJECTED' || report.status === 'BLOCKED_KIT_GENERATION') process.exitCode = 2;
