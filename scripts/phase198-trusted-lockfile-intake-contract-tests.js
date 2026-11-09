#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'phase198-trusted-lockfile-intake.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['candidate import requires explicit --import', () => assert.match(src, /args\.includes\('--import'\)/)],
 ['existing target is never overwritten', () => assert.match(src, /Refusing to overwrite existing apps\/api\/package-lock\.json/)],
 ['candidate size is bounded', () => assert.match(src, /25 \* 1024 \* 1024/)],
 ['lockfile version is validated', () => assert.match(src, /lock\.lockfileVersion < 2/)],
 ['root name and version are checked', () => assert.match(src, /rootPkg\.name !== manifest\.name \|\| rootPkg\.version !== manifest\.version/)],
 ['dependency maps are aligned exactly', () => assert.match(src, /same\(rootPkg\.dependencies, manifest\.dependencies\)/) && assert.match(src, /same\(rootPkg\.devDependencies, manifest\.devDependencies\)/)],
 ['SHA-256 fingerprint is recorded', () => assert.match(src, /sha256: hashFile\(candidate\)/)],
 ['provenance is not inferred from structure', () => assert.match(src, /cannot prove where a candidate came from/)],
 ['install and build are not run', () => assert.match(src, /installExecuted: false, buildExecuted: false/) && assert.doesNotMatch(src, /npm ci|npm install|nest build/)],
 ['production clearance remains false', () => assert.match(src, /productionCleared: false/)],
 ['machine-readable report is generated', () => assert.match(src, /PHASE198_TRUSTED_LOCKFILE_INTAKE_REPORT\.json/)],
 ['phase scripts are registered', () => assert.ok(pkg.scripts['preflight:phase198:lockfile'] && pkg.scripts['test:phase198:contract'])],
 ['read-only preflight reports missing lockfile', () => { const r = spawnSync(process.execPath, [path.join(__dirname,'phase198-trusted-lockfile-intake.js')], {cwd:root,encoding:'utf8'}); assert.equal(r.status, 2); assert.match(r.stdout, /BLOCKED_NO_LOCKFILE_OR_CANDIDATE/); }],
 ['candidate with wrong package identity is rejected', () => { const d=fs.mkdtempSync(path.join(os.tmpdir(),'forestos198-')); try { const f=path.join(d,'package-lock.json'); fs.writeFileSync(f, JSON.stringify({lockfileVersion:3,packages:{'':{name:'wrong',version:'0.1.0',dependencies:pkg.dependencies,devDependencies:pkg.devDependencies}}})); const r=spawnSync(process.execPath,[path.join(__dirname,'phase198-trusted-lockfile-intake.js'),'--candidate',f],{cwd:root,encoding:'utf8'}); assert.equal(r.status,2); assert.match(r.stdout,/does not match/); } finally { fs.rmSync(d,{recursive:true,force:true}); } }],
];
let failed=0; for(const [name,fn] of checks){try{fn();console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e.message}`)}}
console.log(`\nPhase 198 contract tests: ${checks.length-failed}/${checks.length} passed`); process.exitCode=failed?1:0;
