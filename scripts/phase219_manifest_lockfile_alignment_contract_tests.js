#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
const {run}=require('./phase218_actual_api_build_runner'); let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name)}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'forestos219-'));
try {
 const root=path.join(tmp,'project'),api=path.join(root,'apps','api');fs.mkdirSync(api,{recursive:true});
 const manifest={name:'forestos-api',version:'0.1.0',scripts:{build:'nest build'},dependencies:{'@nestjs/core':'^10.0.0'},devDependencies:{typescript:'^5.0.0'},optionalDependencies:{'optional-demo':'^1.0.0'}};
 const lock=(overrides={})=>({name:'forestos-api',version:'0.1.0',lockfileVersion:3,packages:{'':{name:'forestos-api',version:'0.1.0',dependencies:manifest.dependencies,devDependencies:manifest.devDependencies,optionalDependencies:manifest.optionalDependencies,...overrides}}});
 fs.writeFileSync(path.join(api,'package.json'),JSON.stringify(manifest));fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify(lock()));
 test('aligned manifest and lockfile pass read-only preflight',()=>{const r=path.join(root,'ok.json');assert.strictEqual(run(['--root',root,'--report',r]),0);const x=JSON.parse(fs.readFileSync(r));assert(x.checks.some(c=>c.name==='manifest_lockfile_dependency_maps_aligned'&&c.pass));});
 test('dependency mismatch blocks before npm execution',()=>{fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify(lock({dependencies:{'@nestjs/core':'^9.0.0'}})));const r=path.join(root,'bad.json');assert.strictEqual(run(['--root',root,'--report',r,'--execute']),1);const x=JSON.parse(fs.readFileSync(r));assert.strictEqual(x.installOutcome,'not_run');assert(x.checks.some(c=>c.name==='manifest_lockfile_dependency_maps_aligned'&&!c.pass));});
 test('missing lockfile root entry blocks',()=>{fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify({name:manifest.name,version:manifest.version,lockfileVersion:3,packages:{}}));const r=path.join(root,'root-missing.json');assert.strictEqual(run(['--root',root,'--report',r]),1);});
 console.log(`${n}/${n} Phase 219 assertions passed`);
} finally {fs.rmSync(tmp,{recursive:true,force:true})}
