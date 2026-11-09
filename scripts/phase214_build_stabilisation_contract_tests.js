#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'); const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path'); const {preflight}=require('./phase214_build_stabilisation_preflight');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'forestos214-')); const api=path.join(tmp,'apps','api'); fs.mkdirSync(api,{recursive:true});
const manifest={name:'forestos-api',version:'1.2.3',scripts:{build:'nest build'},dependencies:{a:'^1.0.0'},devDependencies:{b:'^2.0.0'},optionalDependencies:{c:'^3.0.0'}};
function writeManifest(){fs.writeFileSync(path.join(api,'package.json'),JSON.stringify(manifest));}
function writeLock(overrides={}){const lock={name:manifest.name,version:manifest.version,lockfileVersion:3,packages:{'':{name:manifest.name,version:manifest.version,dependencies:manifest.dependencies,devDependencies:manifest.devDependencies,optionalDependencies:manifest.optionalDependencies}},...overrides};fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify(lock));}
const tests=[
['missing lockfile blocks npm ci claims',()=>{writeManifest();const r=preflight(tmp);assert.equal(r.assessment,'BUILD_PREFLIGHT_BLOCKED');assert.match(r.blockers.join(' '),/package-lock.json is missing/)}],
['aligned lockfile passes static preflight only',()=>{writeManifest();writeLock();const r=preflight(tmp);assert.equal(r.assessment,'PREFLIGHT_PASSED_BUILD_NOT_YET_RUN');assert.equal(r.actualBuildExecuted,false)}],
['dependency mismatch is rejected',()=>{writeManifest();writeLock();const p=path.join(api,'package-lock.json');const l=JSON.parse(fs.readFileSync(p));l.packages[''].dependencies={a:'^9.0.0'};fs.writeFileSync(p,JSON.stringify(l));assert.match(preflight(tmp).blockers.join(' '),/dependencies does not match/)}],
['missing build script is rejected',()=>{manifest.scripts={};writeManifest();writeLock();assert.match(preflight(tmp).blockers.join(' '),/missing scripts.build/);manifest.scripts={build:'nest build'}}],
['invalid lockfile JSON is rejected',()=>{writeManifest();fs.writeFileSync(path.join(api,'package-lock.json'),'{bad');assert.match(preflight(tmp).blockers.join(' '),/cannot be parsed/)}],
['production is never cleared by preflight',()=>{writeManifest();writeLock();assert.equal(preflight(tmp).productionCleared,false)}],
['optional dependencies are compared',()=>{writeManifest();writeLock();const p=path.join(api,'package-lock.json');const l=JSON.parse(fs.readFileSync(p));l.packages[''].optionalDependencies={c:'^8.0.0'};fs.writeFileSync(p,JSON.stringify(l));assert.match(preflight(tmp).blockers.join(' '),/optionalDependencies does not match/)}],
['package identity mismatch is rejected',()=>{writeManifest();writeLock();const p=path.join(api,'package-lock.json');const l=JSON.parse(fs.readFileSync(p));l.name='wrong';fs.writeFileSync(p,JSON.stringify(l));assert.match(preflight(tmp).blockers.join(' '),/identity\/version/)}],
]; let pass=0;for(const [n,f] of tests){try{f();pass++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n+': '+e.message);process.exitCode=1}} console.log(`Phase 214 contract assertions: ${pass}/${tests.length} passed`);fs.rmSync(tmp,{recursive:true,force:true});
