#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),script=path.join(__dirname,'phase199-build-evidence-gate.js'),pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8')),src=fs.readFileSync(script,'utf8');
const checks=[
['phase script exists',()=>assert.ok(fs.existsSync(script))],
['API manifest is the evidence source',()=>assert.match(src,/manifestPath=path\.join\(api,'package\.json'\)/)],
['SHA-256 evidence is generated',()=>assert.match(src,/createHash\('sha256'\)/)],
['lockfile is required before build',()=>assert.match(src,/lockfileExists/)],
['lockfile root package identity is checked',()=>assert.match(src,/rp\.name===manifest\.name&&rp\.version===manifest\.version/)],
['dependency maps are compared',()=>assert.match(src,/rp\.dependencies\|\|\{\}/)&&assert.match(src,/rp\.devDependencies\|\|\{\}/)],
['build is explicit opt-in',()=>assert.match(src,/args\.includes\('--build'\)/)],
['build timeout is bounded',()=>assert.match(src,/Math\.min\(120000/)],
['build invokes API npm build script',()=>assert.match(src,/spawnSync\('npm',\['run','build'\]/)],
['build result is captured',()=>assert.match(src,/exitCode:r\.status/)],
['production is never automatically cleared',()=>assert.match(src,/productionCleared:false/)],
['report path is machine-readable',()=>assert.match(src,/PHASE199_BUILD_EVIDENCE_REPORT\.json/)],
['phase scripts are registered',()=>assert.ok(pkg.scripts['preflight:phase199:build']&&pkg.scripts['build:phase199:verified']&&pkg.scripts['test:phase199:contract'])],
['preflight accurately blocks without prerequisites',()=>{const r=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});assert.equal(r.status,2);assert.match(r.stdout,/BLOCKED_BUILD_PREREQUISITES/)}],
['preflight does not execute build',()=>{const r=JSON.parse(fs.readFileSync(path.join(root,'PHASE199_BUILD_EVIDENCE_REPORT.json'),'utf8'));assert.equal(r.buildExecuted,false);assert.equal(r.mode,'read-only-preflight')}],
]; let failed=0;for(const [n,f] of checks){try{f();console.log('PASS '+n)}catch(e){failed++;console.error('FAIL '+n+': '+e.message)}}console.log(`\nPhase 199 contract tests: ${checks.length-failed}/${checks.length} passed`);process.exitCode=failed?1:0;
