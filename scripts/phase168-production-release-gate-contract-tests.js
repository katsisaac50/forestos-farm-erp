#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const script = fs.readFileSync(path.join(__dirname, 'phase168-production-release-gate.js'), 'utf8');
const checks = [
 ['release report is machine-readable JSON', script.includes('PHASE168_RELEASE_GATE_REPORT.json') && script.includes('JSON.stringify(report, null, 2)')],
 ['distinguishes PASS, FAIL, BLOCKED, and NOT VERIFIED', ['PASS','FAIL','BLOCKED','NOT VERIFIED'].every(s => script.includes(`'${s}'`))],
 ['does not print MongoDB URI', script.includes('URI not logged') && !script.includes('console.log(uri)')],
 ['requires production build command declaration', script.includes("pkg.scripts.build === 'nest build'")],
 ['checks critical contract suites from phases 164–167', ['164','165','166','167'].every(n => script.includes(n))],
 ['does not run destructive live tests automatically', script.includes('does not run destructive live integration tests automatically')],
 ['flags authorization review as required', script.includes('Registry endpoint authorization review') && script.includes('REVIEW REQUIRED')],
 ['marks missing live database evidence as not verified', script.includes('Live MongoDB transaction evidence') && script.includes('NOT VERIFIED')],
 ['requires disposable database marker before accepting configured URI', script.includes('disposable database marker') && script.includes('FORESTOS_TEST_MONGODB_URI')],
 ['documents incomplete release decision', script.includes('NOT READY — evidence incomplete')],
 ['checks environment configuration template', script.includes('.env.example')],
 ['sets non-zero exit on failed checks', script.includes('if (failed) process.exitCode = 1')],
];
let failed=0; for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`Phase 168 release-gate contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed) process.exitCode=1;
