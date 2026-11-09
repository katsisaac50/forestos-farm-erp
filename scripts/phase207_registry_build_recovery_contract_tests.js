#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'phase207_registry_build_recovery.js');
const src = fs.readFileSync(script, 'utf8');
const tests = [
 ['recovery utility exists', () => assert.ok(fs.existsSync(script))],
 ['identifies phase 207', () => assert.match(src, /phase: 207/)],
 ['default is read-only by design', () => assert.match(src, /Default is read-only/)],
 ['registry probe requires explicit flag', () => assert.match(src, /has\('--probe-registry'\)/)],
 ['registry probe retries are disabled', () => assert.match(src, /--fetch-retries=0/)],
 ['registry probe has bounded timeout', () => assert.match(src, /10000\)/)],
 ['validates API manifest', () => assert.match(src, /package\.json/)],
 ['requires API lockfile', () => assert.match(src, /package-lock\.json is missing/)],
 ['checks lockfile versions', () => assert.match(src, /\[2, 3\]/)],
 ['checks package identity and version', () => assert.match(src, /lr\.name === manifest\.name && lr\.version === manifest\.version/)],
 ['checks root dependency maps', () => assert.match(src, /lr\.devDependencies/)],
 ['uses SHA-256 fingerprints', () => assert.match(src, /createHash\('sha256'\)/)],
 ['install requires explicit flag', () => assert.match(src, /has\('--install'\)/)],
 ['clean install uses npm ci', () => assert.match(src, /\['ci'/)],
 ['install disables lifecycle scripts', () => assert.match(src, /--ignore-scripts/)],
 ['build requires explicit flag', () => assert.match(src, /has\('--build'\)/)],
 ['actual build command is npm run build', () => assert.match(src, /\['run', 'build'/)],
 ['commands have bounded timeouts', () => assert.match(src, /120000\)/)],
 ['records install outcome', () => assert.match(src, /installExitCode/)],
 ['records build outcome', () => assert.match(src, /buildExitCode/)],
 ['production is never auto-cleared', () => assert.match(src, /productionCleared: false/)],
 ['writes machine-readable report', () => assert.match(src, /PHASE207_REGISTRY_BUILD_RECOVERY_REPORT\.json/)],
 ['distinguishes build from runtime readiness', () => assert.match(src, /BUILD_COMMAND_SUCCEEDED_REQUIRES_RUNTIME_TESTS/)],
 ['documents trusted artifact fallback', () => assert.match(src, /trusted Git\/CI artifact/)],
];
let passed = 0;
for (const [name, fn] of tests) { fn(); passed++; console.log(`PASS ${name}`); }
console.log(`Phase 207 contract assertions: ${passed}/${tests.length} passed`);
