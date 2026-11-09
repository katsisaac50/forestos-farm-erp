#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const projectRoot = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'phase209_ci_artifact_verifier.js');
const currentManifestBytes = fs.readFileSync(path.join(projectRoot, 'apps/api/package.json'));
const currentManifest = JSON.parse(currentManifestBytes.toString('utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const commit = 'a'.repeat(40);
function makeArtifact(mutator = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forestos209-'));
  const manifest = JSON.parse(JSON.stringify(currentManifest));
  const lock = { name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages: { '': { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies, devDependencies: manifest.devDependencies } } };
  let lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + '\n');
  let manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const provenance = { phase: 208, commit, registry: 'https://registry.npmjs.org/', manifestSha256: sha(manifestBytes), lockfilePresent: true, lockfileSha256: sha(lockBytes), lockfileValidated: true };
  const values = { dir, manifest, lock, manifestBytes, lockBytes, provenance };
  mutator(values);
  fs.writeFileSync(path.join(dir, 'package.json'), values.manifestBytes);
  fs.writeFileSync(path.join(dir, 'package-lock.json'), values.lockBytes);
  fs.writeFileSync(path.join(dir, 'PHASE208_CI_LOCKFILE_PROVENANCE.json'), JSON.stringify(values.provenance, null, 2));
  return dir;
}
function run(dir, expectedCommit = commit, expectedHash = sha(currentManifestBytes)) {
  const report = path.join(dir, 'verification.json');
  const result = spawnSync(process.execPath, [script, '--artifact-dir', dir, '--expected-commit', expectedCommit, '--expected-manifest-sha256', expectedHash, '--report', report], { encoding: 'utf8' });
  const parsed = JSON.parse(fs.readFileSync(report, 'utf8'));
  return { result, report: parsed };
}
const tests = [
  ['verifier exists', () => assert.ok(fs.existsSync(script))],
  ['missing inputs block verification', () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'forestos209-')); const r = spawnSync(process.execPath, [script, '--report', path.join(d, 'r.json')], { encoding: 'utf8' }); assert.equal(r.status, 2); assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'r.json'))).status, 'BLOCKED_REQUIRED_INPUTS_MISSING'); }],
  ['valid artifact passes structural verification', () => { const d = makeArtifact(); const r = run(d); assert.equal(r.result.status, 0); assert.equal(r.report.status, 'VERIFIED_ARTIFACT_REQUIRES_HUMAN_SOURCE_REVIEW'); }],
  ['wrong expected commit is rejected', () => { const d = makeArtifact(); const r = run(d, 'b'.repeat(40)); assert.equal(r.result.status, 2); assert.equal(r.report.status, 'REJECTED_ARTIFACT'); }],
  ['provenance commit mismatch is rejected', () => { const d = makeArtifact(v => v.provenance.commit = 'c'.repeat(40)); const r = run(d); assert.equal(r.result.status, 2); }],
  ['wrong expected manifest fingerprint is rejected', () => { const d = makeArtifact(); const r = run(d, commit, 'f'.repeat(64)); assert.equal(r.result.status, 2); }],
  ['tampered manifest fingerprint is rejected', () => { const d = makeArtifact(v => v.provenance.manifestSha256 = 'f'.repeat(64)); const r = run(d); assert.equal(r.result.status, 2); }],
  ['tampered lockfile fingerprint is rejected', () => { const d = makeArtifact(v => v.provenance.lockfileSha256 = 'f'.repeat(64)); const r = run(d); assert.equal(r.result.status, 2); }],
  ['dependency map mismatch is rejected', () => { const d = makeArtifact(v => { const l = JSON.parse(v.lockBytes); l.packages[''].dependencies = {}; v.lockBytes = Buffer.from(JSON.stringify(l)); v.provenance.lockfileSha256 = sha(v.lockBytes); }); const r = run(d); assert.equal(r.result.status, 2); }],
  ['package identity mismatch is rejected', () => { const d = makeArtifact(v => { const l = JSON.parse(v.lockBytes); l.name = 'not-forestos-api'; v.lockBytes = Buffer.from(JSON.stringify(l)); v.provenance.lockfileSha256 = sha(v.lockBytes); }); const r = run(d); assert.equal(r.result.status, 2); }],
  ['unsupported lockfile version is rejected', () => { const d = makeArtifact(v => { const l = JSON.parse(v.lockBytes); l.lockfileVersion = 99; v.lockBytes = Buffer.from(JSON.stringify(l)); v.provenance.lockfileSha256 = sha(v.lockBytes); }); const r = run(d); assert.equal(r.result.status, 2); }],
  ['non-HTTPS registry is rejected', () => { const d = makeArtifact(v => v.provenance.registry = 'http://registry.npmjs.org/'); const r = run(d); assert.equal(r.result.status, 2); }],
  ['missing provenance is rejected', () => { const d = makeArtifact(); fs.unlinkSync(path.join(d, 'PHASE208_CI_LOCKFILE_PROVENANCE.json')); const r = run(d); assert.equal(r.result.status, 2); }],
  ['malformed provenance is rejected', () => { const d = makeArtifact(); fs.writeFileSync(path.join(d, 'PHASE208_CI_LOCKFILE_PROVENANCE.json'), '{'); const r = run(d); assert.equal(r.result.status, 2); }],
  ['missing lockfile is rejected', () => { const d = makeArtifact(); fs.unlinkSync(path.join(d, 'package-lock.json')); const r = run(d); assert.equal(r.result.status, 2); }],
  ['missing manifest is rejected', () => { const d = makeArtifact(); fs.unlinkSync(path.join(d, 'package.json')); const r = run(d); assert.equal(r.result.status, 2); }],
  ['verifier never imports lockfile', () => { const d = makeArtifact(); const r = run(d); assert.equal(r.report.importExecuted, false); }],
  ['verifier never installs dependencies', () => { const d = makeArtifact(); const r = run(d); assert.equal(r.report.installExecuted, false); }],
  ['verifier never builds API', () => { const d = makeArtifact(); const r = run(d); assert.equal(r.report.buildExecuted, false); }],
  ['verifier never claims production clearance', () => { const d = makeArtifact(); const r = run(d); assert.equal(r.report.productionCleared, false); }],
  ['report requires human source review after success', () => { const d = makeArtifact(); const r = run(d); assert.match(r.report.status, /HUMAN_SOURCE_REVIEW/); }],
  ['report records offline-only mode', () => { const d = makeArtifact(); const r = run(d); assert.equal(r.report.mode, 'offline-read-only'); assert.equal(r.report.networkAccessAttempted, false); }],
  ['artifact manifest must match current project manifest', () => { const d = makeArtifact(v => { const m = JSON.parse(v.manifestBytes); m.description = 'different'; v.manifestBytes = Buffer.from(JSON.stringify(m)); v.provenance.manifestSha256 = sha(v.manifestBytes); }); const r = run(d); assert.equal(r.result.status, 2); }],
  ['report includes next actions', () => { const d = makeArtifact(); const r = run(d); assert.ok(r.report.nextActions.length >= 3); }],
];
let passed = 0;
for (const [name, test] of tests) { try { test(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.stack}`); process.exitCode = 1; } }
console.log(`Phase 209 contract assertions: ${passed}/${tests.length} passed`);
