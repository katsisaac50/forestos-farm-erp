#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(__dirname, 'phase193-lockfile-recovery-gate.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['uses API manifest and lockfile paths', () => assert.match(script, /path\.join\(api, 'package\.json'\)/) && assert.match(script, /path\.join\(api, 'package-lock\.json'\)/)],
 ['lockfile generation is explicit opt-in', () => assert.match(script, /process\.argv\.includes\('--generate-lockfile'\)/)],
 ['generation uses npm package-lock-only', () => assert.match(script, /'--package-lock-only'/)],
 ['lifecycle scripts are disabled', () => assert.match(script, /'--ignore-scripts'/)],
 ['network retries are disabled and timeout bounded', () => assert.match(script, /'--fetch-retries=0'/) && assert.match(script, /Math\.min\([^\n]+25000\)/)],
 ['existing lockfile is not overwritten', () => assert.match(script, /if \(fs\.existsSync\(lockPath\)\) stop\('A package-lock\.json already exists/)],
 ['generated lockfile validates lockfile version and root package', () => assert.match(script, /Number\.isInteger\(parsed\.lockfileVersion\)/) && assert.match(script, /parsed\.packages\[''\]\.name === pkg\.name/) && assert.match(script, /parsed\.packages\[''\]\.version === pkg\.version/)],
 ['records attempted generation separately from success', () => assert.match(script, /attempted: false/) && assert.match(script, /succeeded: false/)],
 ['does not execute clean install or build', () => assert.match(script, /cleanInstallExecuted: false/) && assert.match(script, /buildExecuted: false/) && assert.doesNotMatch(script, /spawnSync\('npm', \['ci'/)],
 ['report explicitly withholds production clearance', () => assert.match(script, /productionCleared: false/) && assert.match(script, /PHASE193_LOCKFILE_RECOVERY_REPORT\.json/)],
 ['bounded output is used for npm process', () => assert.match(script, /maxBuffer: 1024 \* 1024/)],
 ['Phase 193 scripts are registered', () => assert.ok(pkg.scripts['recover:phase193:lockfile'] && pkg.scripts['test:phase193:contract'])],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 193 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
