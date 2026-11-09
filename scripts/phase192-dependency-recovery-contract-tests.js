#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(__dirname, 'phase192-dependency-recovery-diagnostics.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['uses the API manifest and package lock paths', () => assert.match(script, /path\.join\(api, 'package\.json'\)/) && assert.match(script, /path\.join\(api, 'package-lock\.json'\)/)],
 ['registry connectivity check is explicit opt-in', () => assert.match(script, /process\.argv\.includes\('--check-registry'\)/)],
 ['registry timeout is bounded', () => assert.match(script, /Math\.min\([^\n]+30000\)/)],
 ['uses npm ping without retries', () => assert.match(script, /\['ping', '--fetch-retries=0'/)],
 ['validates manifest JSON and required fields', () => assert.match(script, /JSON\.parse\(fs\.readFileSync\(pkgPath/)],
 ['checks build script and declared dependencies', () => assert.match(script, /Build script is declared/) && assert.match(script, /Dependency declarations are non-empty/)],
 ['checks duplicate dependency group entries', () => assert.match(script, /No dependency is duplicated across dependency groups/)],
 ['checks lockfile root package alignment', () => assert.match(script, /lock\.packages\[''\]\.name === pkg\.name/)],
 ['records network check outcome without leaking credentials', () => assert.match(script, /registryCheck/) && !assert.match(script, /console\.log\(process\.env/)],
 ['does not install packages or build automatically', () => assert.doesNotMatch(script, /spawnSync\('npm', \['ci'/) && assert.doesNotMatch(script, /spawnSync\('npm', \['run', 'build'/)],
 ['writes a machine-readable report and blocks production clearance', () => assert.match(script, /PHASE192_DEPENDENCY_RECOVERY_REPORT\.json/) && assert.match(script, /productionCleared: false/)],
 ['exposes Phase 192 scripts', () => assert.ok(pkg.scripts['diagnose:phase192:dependencies'] && pkg.scripts['test:phase192:contract'])],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 192 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
