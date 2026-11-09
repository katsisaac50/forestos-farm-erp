#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const probe=fs.readFileSync(path.join(root,'scripts/phase175-cross-tenant-write-protection-probe.js'),'utf8');
const notesPath=path.join(root,'PHASE175_NOTES.md');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const checks=[
 ['requires explicit mutation opt-in and disposable environment',/FORESTOS_TEST_ALLOW_MUTATIONS !== 'YES'/.test(probe)&&/FORESTOS_TEST_ENVIRONMENT !== 'disposable'/.test(probe)],
 ['uses PATCH for cross-tenant write attempt',/request\(patchUrl, at, 'PATCH', patchPayload\)/.test(probe)],
 ['requires separate tenant identities and tokens',/aid === bid \|\| at === bt/.test(probe)],
 ['requires owner fixture marker before mutation',/Tenant B fixture readable before mutation/.test(probe)&&/before\.raw\.includes\(marker\)/.test(probe)],
 ['expects forbidden/not-found status for cross-tenant mutation',/\[401,403,404\]\.includes\(attempted\.status\)/.test(probe)],
 ['re-reads owner fixture after mutation',/request\(readUrl, bt, 'GET'\)/.test(probe)&&/Tenant B fixture marker remains unchanged/.test(probe)],
 ['restricts all endpoint paths to same origin',/u\.origin !== base\.origin/.test(probe)],
 ['blocks credential query parameters',/searchParams\.has\('token'\)/.test(probe)&&/searchParams\.has\('access_token'\)/.test(probe)],
 ['uses manual redirects and request timeout',/redirect: 'manual'/.test(probe)&&/AbortSignal\.timeout\(12000\)/.test(probe)],
 ['limits response sizes',/2\*1024\*1024/.test(probe)],
 ['does not log credentials or response bodies',!/console\.log\([^\n]*(?:raw|body|token)/i.test(probe)&&/never logged/.test(probe)],
 ['reports NOT VERIFIED when configuration is incomplete',/NOT VERIFIED/.test(probe)&&/missing required settings/.test(probe)],
 ['writes machine-readable report',/PHASE175_CROSS_TENANT_WRITE_PROTECTION_REPORT\.json/.test(probe)&&/JSON\.stringify\(report/.test(probe)],
 ['limitations explicitly scope probe to one PATCH scenario',/does not test DELETE, all mutation routes/.test(probe)],
 ['notes explain safe execution and limitations',fs.existsSync(notesPath)&&fs.readFileSync(notesPath,'utf8').includes('never use production')],
 ['npm scripts registered',!!pkg.scripts['test:phase175:contract']&&!!pkg.scripts['test:phase175:live']],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`Phase 175 cross-tenant write contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed)process.exitCode=1;
