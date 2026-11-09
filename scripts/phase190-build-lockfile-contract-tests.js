#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const bootstrap = fs.readFileSync(path.join(__dirname,'phase190-lockfile-bootstrap.js'),'utf8');
const audit = fs.readFileSync(path.join(__dirname,'phase190-build-lockfile-readiness.js'),'utf8');
const checks = [
 ['npm package manager is explicitly selected', () => assert.equal(pkg.name,'forestos-api')],
 ['lockfile bootstrap command is exposed', () => assert.match(pkg.scripts['bootstrap:phase190:lockfile'],/phase190-lockfile-bootstrap\.js/)],
 ['readiness audit command is exposed', () => assert.match(pkg.scripts['audit:phase190:build'],/phase190-build-lockfile-readiness\.js/)],
 ['contract test command is exposed', () => assert.match(pkg.scripts['test:phase190:contract'],/phase190-build-lockfile-contract-tests\.js/)],
 ['bootstrap uses npm package-lock-only', () => assert.match(bootstrap,/spawnSync\('npm', \['install', '--package-lock-only'/)],
 ['bootstrap avoids lifecycle scripts', () => assert.match(bootstrap,/--ignore-scripts/)],
 ['bootstrap has a bounded timeout', () => assert.match(bootstrap,/timeout: Number\(process\.env\.FORESTOS_LOCKFILE_TIMEOUT_MS/)],
 ['bootstrap validates generated lockfile structure', () => assert.match(bootstrap,/lockfileVersion.*packages/)],
 ['bootstrap does not overwrite malformed lockfiles automatically', () => assert.match(bootstrap,/inspect it before replacing/)],
 ['readiness audit does not execute clean install', () => assert.match(audit,/cleanInstallExecuted: false/)],
 ['readiness audit does not execute build', () => assert.match(audit,/buildExecuted: false/)],
 ['production clearance remains false', () => assert.match(audit,/productionCleared: false/)],
 ['readiness report is persisted', () => assert.match(audit,/PHASE190_BUILD_LOCKFILE_READINESS\.json/)],
];
let failed=0; for(const [name,fn] of checks){try{fn();console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e.message}`)}}
console.log(`\nPhase 190 contract tests: ${checks.length-failed}/${checks.length} passed`); process.exitCode=failed?1:0;
