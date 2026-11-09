#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'phase196-local-lockfile-recovery.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['read-only scan is default', () => assert.match(src, /process\.argv\.includes\('--recover'\)/)],
 ['recovery is explicit opt-in', () => assert.match(src, /if \(recover\)/)],
 ['only npm lockfile artifact names are scanned', () => assert.match(src, /\['package-lock\.json', 'npm-shrinkwrap\.json'\]/)],
 ['node_modules and generated folders are excluded', () => assert.match(src, /node_modules.*\.next.*dist.*build.*coverage/)],
 ['scan count is bounded', () => assert.match(src, /maxFiles = 12000/)],
 ['candidate file size is bounded', () => assert.match(src, /maxBytes = 25 \* 1024 \* 1024/)],
 ['candidate JSON and lockfile version are checked', () => assert.match(src, /Number\.isInteger\(lock\.lockfileVersion\)/)],
 ['candidate root package identity and version must match', () => assert.match(src, /lock\.packages\?\.\[''\]\?\.name === report\.manifest\.name/) && assert.match(src, /lock\.packages\?\.\[''\]\?\.version === report\.manifest\.version/)],
 ['recovery refuses overwrite', () => assert.match(src, /flag: 'wx'/) && assert.match(src, /Refusing to overwrite an existing target lockfile/)],
 ['SHA-256 checksums recorded', () => assert.match(src, /createHash\('sha256'\)/)],
 ['report keeps install and build unclaimed', () => assert.match(src, /installExecuted: false, buildExecuted: false, productionCleared: false/)],
 ['report file is registered', () => assert.match(src, /PHASE196_LOCAL_LOCKFILE_RECOVERY_REPORT\.json/)],
 ['package scripts registered', () => assert.ok(pkg.scripts['recover:phase196:lockfile'] && pkg.scripts['test:phase196:contract'])],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 196 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
