#!/usr/bin/env node
'use strict';
const assert=require('assert');
const {evaluate}=require('./phase220_authoritative_build_gate');
let n=0; function test(name,fn){fn();n++;process.stdout.write(`PASS ${name}\n`)}
const sha='a'.repeat(40);
test('rejects missing evidence fields',()=>{const r=evaluate({},sha);assert.equal(r.status,'BLOCKED');assert.equal(r.productionCleared,false);});
test('requires full expected commit SHA',()=>{const r=evaluate({commitSha:sha,installOutcome:'success',buildOutcome:'success',jobConclusion:'success'},'abc');assert(r.blockers.some(x=>x.startsWith('expected_commit_is_full_sha')));});
test('rejects commit mismatch',()=>{const r=evaluate({commitSha:'b'.repeat(40),installOutcome:'success',buildOutcome:'success',jobConclusion:'success'},sha);assert(r.blockers.some(x=>x.startsWith('commit_matches')));});
test('requires install, build, and workflow success',()=>{const r=evaluate({commitSha:sha,installOutcome:'success',buildOutcome:'success',jobConclusion:'failure'},sha);assert(r.blockers.some(x=>x.startsWith('job_succeeded')));});
test('accepts complete matching evidence without clearing production',()=>{const r=evaluate({commitSha:sha,installOutcome:'success',buildOutcome:'success',jobConclusion:'success',productionCleared:false},sha);assert.equal(r.status,'BUILD_EVIDENCE_VERIFIED');assert.equal(r.productionCleared,false);});
test('rejects auto-production-clear claims',()=>{const r=evaluate({commitSha:sha,installOutcome:'success',buildOutcome:'success',jobConclusion:'success',productionCleared:true},sha);assert.equal(r.status,'BLOCKED');});
console.log(`${n}/${n} Phase 220 assertions passed`);
