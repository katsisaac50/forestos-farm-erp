#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'phase200_release_evidence_bundle.js');
const pkgPath = path.join(root, 'apps', 'api', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const src = fs.readFileSync(script, 'utf8');
const checks = [
 ['Phase 200 script exists', () => assert.ok(fs.existsSync(script))],
 ['aggregates prior phase evidence', () => assert.match(src, /historicalReports/)],
 ['includes phases 193 and 199', () => assert.match(src, /PHASE193_LOCKFILE_RECOVERY_REPORT\.json/) && assert.match(src, /PHASE199_BUILD_EVIDENCE_REPORT\.json/)],
 ['read-only mode is declared', () => assert.match(src, /read-only-evidence-aggregation/)],
 ['does not execute build or install', () => assert.doesNotMatch(src, /spawnSync\('npm',\['run','build'\]/) && assert.doesNotMatch(src, /spawnSync\('npm',\['ci'/)],
 ['manifest is parsed and fingerprinted', () => assert.match(src, /apiManifestValid/) && assert.match(src, /sha256: hash\(manifestPath\)/)],
 ['lockfile root package identity is checked', () => assert.match(src, /rootPackage\.name === manifest\.value\.name/) && assert.match(src, /rootPackage\.version === manifest\.value\.version/)],
 ['dependency maps must align', () => assert.match(src, /rootPackage\.dependencies \|\| \{\}/) && assert.match(src, /rootPackage\.devDependencies \|\| \{\}/)],
 ['records lockfile fingerprint', () => assert.match(src, /sha256: hash\(lockPath\)/)],
 ['captures Node and npm versions', () => assert.match(src, /spawnSync\(process\.execPath, \['--version'\]/) && assert.match(src, /spawnSync\('npm', \['--version'\]/)],
 ['checks local Nest CLI', () => assert.match(src, /nestCliExists/)],
 ['known legacy JSON issue is surfaced', () => assert.match(src, /PHASE125_SCHEMA_INDEX_READINESS\.json/)],
 ['production never auto-clears', () => assert.match(src, /productionCleared: false/)],
 ['report path is defined', () => assert.match(src, /PHASE200_RELEASE_EVIDENCE_BUNDLE\.json/)],
 ['API package scripts are registered', () => assert.ok(pkg.scripts['audit:phase200:release-evidence'] && pkg.scripts['test:phase200:contract'])],
 ['preflight report records missing prerequisites truthfully', () => { const r = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }); const report = JSON.parse(fs.readFileSync(path.join(root, 'PHASE200_RELEASE_EVIDENCE_BUNDLE.json'), 'utf8')); assert.equal(report.productionCleared, false); assert.equal(report.buildExecutedByThisTool, false); assert.ok(['BLOCKED_DEPENDENCY_OR_BUILD_PREREQUISITES','READY_FOR_EXPLICIT_BUILD_NOT_PRODUCTION_CLEARED'].includes(report.status)); if (!report.checks.apiLockfileExists) assert.match(report.status, /BLOCKED/); }]
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log('PASS ' + name); } catch (e) { failed++; console.error('FAIL ' + name + ': ' + e.message); } }
console.log(`\nPhase 200 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
