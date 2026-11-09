#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'phase197-trusted-lockfile-provenance-gate.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['manifest fingerprint uses SHA-256', () => assert.match(src, /manifest.*sha256: hashFile\(manifestPath\)/)],
 ['lockfile fingerprint uses SHA-256', () => assert.match(src, /report\.lockfile\.sha256 = hashFile\(target\)/)],
 ['lockfile JSON parse is guarded', () => assert.match(src, /try \{\s*const lock = JSON\.parse/)],
 ['root package name is checked', () => assert.match(src, /lock\.packages\?\.\[''\]\?\.name === manifest\.name/)],
 ['root package version is checked', () => assert.match(src, /lock\.packages\?\.\[''\]\?\.version === manifest\.version/)],
 ['missing lockfile blocks release', () => assert.match(src, /BLOCKED_MISSING_TRUSTED_LOCKFILE/)],
 ['structural alignment does not claim trusted provenance', () => assert.match(src, /structurally_aligned_requires_external_provenance/)],
 ['no install or build is executed', () => assert.match(src, /installExecuted: false, buildExecuted: false/)],
 ['production clearance remains false', () => assert.match(src, /productionCleared: false/)],
 ['report is machine-readable JSON', () => assert.match(src, /PHASE197_TRUSTED_LOCKFILE_PROVENANCE_REPORT\.json/)],
 ['environment records Node and npm versions', () => assert.match(src, /node: process\.version/) && assert.match(src, /run\('npm', \['--version'\]\)/)],
 ['package scripts are registered', () => assert.ok(pkg.scripts['preflight:phase197:lockfile'] && pkg.scripts['test:phase197:contract'])],
 ['no package manager network calls are embedded', () => assert.doesNotMatch(src, /npm install|npm ci|npm exec/)],
 ['manifest source path is fixed inside API project', () => assert.match(src, /path\.join\(apiDir, 'package\.json'\)/)],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 197 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
