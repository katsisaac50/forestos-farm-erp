#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const probe=fs.readFileSync(path.join(root,'scripts/phase174-live-registry-isolation-probe.js'),'utf8');
const notesPath=path.join(root,'PHASE174_NOTES.md');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const checks=[
 ['probe is explicitly read-only HTTP GET',/mode: 'read-only HTTP GET'/.test(probe)&&/method: 'GET'/.test(probe)],
 ['probe requires two distinct tenant IDs',/FORESTOS_TEST_TENANT_A_ID/.test(probe)&&/FORESTOS_TEST_TENANT_B_ID/.test(probe)&&/aid === bid/.test(probe)],
 ['probe requires distinct test tokens',/at === bt/.test(probe)],
 ['probe requires separate record markers',/FORESTOS_TEST_TENANT_A_RECORD_MARKER/.test(probe)&&/FORESTOS_TEST_TENANT_B_RECORD_MARKER/.test(probe)],
 ['probe rejects unsafe API base URL',/Base URL must be HTTP\(S\)/.test(probe)],
 ['probe restricts endpoint paths to same origin',/u\.origin !== base\.origin/.test(probe)],
 ['probe blocks credential query parameters',/searchParams\.has\('token'\)/.test(probe)&&/searchParams\.has\('access_token'\)/.test(probe)],
 ['probe uses redirect manual mode',/redirect: 'manual'/.test(probe)],
 ['probe has request timeout',/AbortSignal\.timeout\(12000\)/.test(probe)],
 ['probe checks both expected tenant IDs',/aIds\.includes\(aid\) && !aIds\.includes\(bid\)/.test(probe)&&/bIds\.includes\(bid\) && !bIds\.includes\(aid\)/.test(probe)],
 ['probe checks both cross-tenant marker absences',/!ra\.raw\.includes\(bm\)/.test(probe)&&/!rb\.raw\.includes\(am\)/.test(probe)],
 ['probe never prints response bodies or tokens',!/console\.log\([^\n]*(?:raw|body|token)/i.test(probe)&&/response body is never printed/.test(probe)],
 ['probe records NOT VERIFIED when configuration missing',/NOT VERIFIED/.test(probe)&&/missing required opt-in settings/.test(probe)],
 ['probe writes a machine-readable report',/PHASE174_LIVE_REGISTRY_ISOLATION_REPORT\.json/.test(probe)&&/JSON\.stringify\(report/.test(probe)],
 ['limitations explicitly prevent overclaiming',/does not test writes, role matrices, all routes/.test(probe)],
 ['phase notes document safe use and limits',fs.existsSync(notesPath)&&fs.readFileSync(notesPath,'utf8').includes('never use production credentials')],
 ['npm scripts are registered',!!pkg.scripts['test:phase174:contract']&&!!pkg.scripts['test:phase174:live']],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`Phase 174 live registry isolation contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed)process.exitCode=1;
