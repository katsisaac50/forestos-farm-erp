#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { diagnose } = require('./phase213_build_evidence_diagnose');
const sha = 'a'.repeat(40);
const base = { sourceCommit: sha, lockfileStepOutcome: 'success', installStepOutcome: 'success', buildStepOutcome: 'success', apiBuildSucceeded: true, jobConclusion: 'success', productionCleared: false };
const tests = [
 ['all successful outcomes produce verified, non-production-cleared result', () => { const r = diagnose(base); assert.equal(r.evidenceAssessment, 'BUILD_VERIFIED_NOT_PRODUCTION_CLEARED'); assert.equal(r.productionCleared, false); }],
 ['failed lockfile step is diagnosed', () => assert.match(diagnose({...base, lockfileStepOutcome:'failure'}).actions.join(' '), /lockfile preparation/) ],
 ['failed install step is diagnosed', () => assert.match(diagnose({...base, installStepOutcome:'failure'}).actions.join(' '), /dependency installation/) ],
 ['failed build step is diagnosed', () => assert.match(diagnose({...base, buildStepOutcome:'failure', apiBuildSucceeded:false}).actions.join(' '), /API compilation/) ],
 ['successful build with failed job is not verified', () => assert.equal(diagnose({...base, jobConclusion:'failure'}).evidenceAssessment, 'BUILD_NOT_VERIFIED')],
 ['success flag alone cannot verify a build', () => assert.equal(diagnose({...base, buildStepOutcome:'failure'}).evidenceAssessment, 'BUILD_NOT_VERIFIED')],
 ['short commit hash is rejected', () => assert.match(diagnose({...base, sourceCommit:'abc'}).actions.join(' '), /full 40-character/) ],
 ['production clearance can never be inferred', () => assert.equal(diagnose({...base, productionCleared:true}).evidenceAssessment, 'BUILD_NOT_VERIFIED')],
 ['unknown step outcomes are treated as unverified', () => assert.equal(diagnose({...base, installStepOutcome:'mystery'}).evidenceAssessment, 'BUILD_NOT_VERIFIED')],
 ['skipped build is not successful', () => assert.equal(diagnose({...base, buildStepOutcome:'skipped', apiBuildSucceeded:false}).evidenceAssessment, 'BUILD_NOT_VERIFIED')],
 ['job failure yields explicit job-level guidance', () => assert.match(diagnose({...base, jobConclusion:'cancelled'}).actions.join(' '), /complete GitHub Actions job conclusion/)],
 ['missing success boolean is not accepted', () => assert.equal(diagnose({...base, apiBuildSucceeded:undefined}).evidenceAssessment, 'BUILD_NOT_VERIFIED')],
];
let passed=0; for(const [name,test] of tests){try{test();passed++;console.log(`PASS ${name}`)}catch(e){console.error(`FAIL ${name}: ${e.message}`);process.exitCode=1}}
console.log(`Phase 213 contract assertions: ${passed}/${tests.length} passed`);
