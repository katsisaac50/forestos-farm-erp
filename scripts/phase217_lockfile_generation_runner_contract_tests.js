'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const script = path.resolve(__dirname, 'phase217_lockfile_generation_runner.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'forestos217-'));
function setup(lock) {
 const root=path.join(tmp, 'case'+Math.random().toString(16).slice(2));
 const api=path.join(root,'apps','api'); fs.mkdirSync(api,{recursive:true});
 const manifest={name:'forestos-api',version:'0.1.0',scripts:{build:'nest build'},dependencies:{'@nestjs/core':'^10.0.0'},devDependencies:{'@nestjs/cli':'^10.0.0'}};
 fs.writeFileSync(path.join(api,'package.json'),JSON.stringify(manifest,null,2));
 if(lock!==undefined) fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify(lock));
 return root;
}
function exec(root) { const r=spawnSync(process.execPath,[script,'--root',root,'--report',path.join(root,'report.json')],{encoding:'utf8'}); return {code:r.status,report:JSON.parse(fs.readFileSync(path.join(root,'report.json'),'utf8'))}; }
let passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1}}
const good={name:'forestos-api',version:'0.1.0',lockfileVersion:3,requires:true,packages:{'':{name:'forestos-api',version:'0.1.0',dependencies:{'@nestjs/core':'^10.0.0'},devDependencies:{'@nestjs/cli':'^10.0.0'}}}};
test('missing lockfile blocks without generating',()=>{const r=setup();const x=exec(r);assert.equal(x.code,1);assert.equal(x.report.status,'BLOCKED');assert.equal(x.report.generationRequested,false)});
test('aligned lockfile is readiness only, not build success',()=>{const r=setup(good);const x=exec(r);assert.equal(x.code,0);assert.equal(x.report.status,'LOCKFILE_READY_NOT_BUILD_VERIFIED');assert(x.report.actions.some(a=>String(a.detail||'').includes('does not establish build success')))});
test('mismatched lockfile identity blocks',()=>{const r=setup({...good,name:'wrong-name'});const x=exec(r);assert.equal(x.code,1);assert(x.report.checks.some(c=>c.name==='lockfile_identity'&&!c.pass))});
test('dependency map mismatch blocks',()=>{const r=setup({...good,packages:{'':{...good.packages[''],dependencies:{wrong:'1.0.0'}}}});const x=exec(r);assert.equal(x.code,1);assert(x.report.checks.some(c=>c.name==='root_dependency_alignment'&&!c.pass))});
test('report includes manifest fingerprint and versions',()=>{const r=setup(good);const x=exec(r);assert.match(x.report.evidence.manifestSha256,/^[a-f0-9]{64}$/);assert(x.report.evidence.nodeVersion)});
console.log(`${passed}/5 Phase 217 contract tests passed`);
