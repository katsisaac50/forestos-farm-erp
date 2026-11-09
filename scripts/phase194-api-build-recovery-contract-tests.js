#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'phase194-api-build-recovery-orchestrator.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['default mode is read-only preflight', () => assert.match(source, /: 'preflight'/)],
 ['supports explicit preflight, install, build and all modes', () => ['--preflight','--install','--build','--all'].forEach(x => assert.ok(source.includes(x)))],
 ['validates manifest and build script', () => assert.match(source, /!pkg\.scripts\.build/)],
 ['requires aligned lockfile before clean install', () => assert.match(source, /if \(!report\.lockfile\.aligned\)/) && assert.match(source, /'ci', '--ignore-scripts'/)],
 ['clean install disables lifecycle scripts and audit noise', () => assert.match(source, /'ci', '--ignore-scripts', '--no-audit', '--no-fund'/)],
 ['install timeout is bounded', () => assert.match(source, /Math\.min\([^\n]+600000\)/)],
 ['build requires local Nest CLI', () => assert.match(source, /node_modules', '@nestjs', 'cli', 'bin', 'nest\.js'/)],
 ['actual build command is executed only in explicit build modes', () => assert.match(source, /runNpm\(\['run', 'build'\]/)],
 ['build timeout is bounded', () => assert.match(source, /Math\.min\([^\n]+300000\)/)],
 ['records install and build attempts and success separately', () => assert.match(source, /install: \{ attempted: false, succeeded: false/) && assert.match(source, /build: \{ attempted: false, succeeded: false/)],
 ['writes a machine-readable report and never clears production', () => assert.match(source, /PHASE194_API_BUILD_RECOVERY_REPORT\.json/) && assert.match(source, /productionCleared: false/)],
 ['npm commands are bounded and output is capped', () => assert.match(source, /timeout, maxBuffer: 2 \* 1024 \* 1024/)],
 ['Phase 194 scripts are registered', () => assert.ok(pkg.scripts['preflight:phase194:api'] && pkg.scripts['install:phase194:api'] && pkg.scripts['build:phase194:api'] && pkg.scripts['test:phase194:contract'])],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 194 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
