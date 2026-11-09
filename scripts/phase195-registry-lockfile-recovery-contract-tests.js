#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'phase195-registry-lockfile-recovery-diagnostics.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['offline preflight is default', () => assert.match(src, /checkRegistry = process\.argv\.includes\('--check-registry'\)/)],
 ['registry probe is opt-in', () => assert.match(src, /if \(checkRegistry\)/)],
 ['registry timeout is bounded to 15 seconds', () => assert.match(src, /Math\.min\([^\n]+15000\)/)],
 ['npm ping disables retries', () => assert.match(src, /'ping', '--fetch-retries=0'/)],
 ['manifest metadata and build script are validated', () => assert.match(src, /pkg\.scripts\?\.build/)],
 ['lockfile root identity and version are validated', () => assert.match(src, /lock\.packages\?\.\[''\]\?\.name === pkg\.name/) && assert.match(src, /lock\.packages\?\.\[''\]\?\.version === pkg\.version/)],
 ['does not fabricate or write a lockfile', () => assert.ok(!src.includes('writeFileSync(lockPath'))],
 ['reports install and build as not executed', () => assert.match(src, /cleanInstallExecuted: false, buildExecuted: false/)],
 ['production clearance remains false', () => assert.match(src, /productionCleared: false/)],
 ['writes machine-readable report', () => assert.match(src, /PHASE195_REGISTRY_LOCKFILE_RECOVERY_REPORT\.json/)],
 ['registers Phase 195 commands', () => assert.ok(pkg.scripts['diagnose:phase195:registry'] && pkg.scripts['test:phase195:contract'])],
 ['network and command output are bounded', () => assert.match(src, /maxBuffer: 1024 \* 1024/)],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 195 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
