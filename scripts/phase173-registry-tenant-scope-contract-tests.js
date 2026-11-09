#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const service = fs.readFileSync(path.join(root,'apps/api/src/registry-persistence/registry-persistence.service.ts'),'utf8');
const controller = fs.readFileSync(path.join(root,'apps/api/src/registry-persistence/registry-persistence.controller.ts'),'utf8');
const checks = [
 ['record snapshot reads are tenant-scoped', /this\.records\.find\(\{\s*tenantId\s*\}\)/.test(service)],
 ['post-write snapshot reads are tenant-scoped', (service.match(/this\.records\.find\(\{\s*tenantId\s*\}\)/g)||[]).length >= 2],
 ['record writes filter by tenant and stable record key', /this\.records\.updateOne\(\s*\{\s*tenantId,\s*domain:\s*doc\.domain,\s*recordId:\s*doc\.recordId/.test(service)],
 ['optimistic update writes compare prior version', /doc\.version > 1 \? \{ version: doc\.version - 1 \}/.test(service)],
 ['revision lookup is tenant-scoped', /this\.commits\.findOne\(\{\s*tenantId,\s*kind:\s*'revision'\s*\}\)/.test(service)],
 ['idempotency lookup is tenant-scoped', /this\.commits\.findOne\(\{\s*tenantId,\s*kind:\s*'batch',\s*batchHash\s*\}\)/.test(service)],
 ['commit ledger writes include tenantId', /const commit = \{\s*tenantId,\s*commitId,\s*kind:\s*'batch'/.test(service)],
 ['revision update filter is tenant-scoped', /this\.commits\.updateOne\(\s*\{\s*tenantId,\s*kind:\s*'revision'\s*\}/.test(service)],
 ['database operations share transaction session', /\.session\(session\)/.test(service) && /\{[^}]*session[^}]*runValidators:\s*true[^}]*\}/.test(service) && /this\.commits\.create\(\[commit\],\s*\{\s*session\s*\}\)/.test(service)],
 ['tenant identity derives from authenticated claims', /req\.user\?\.organizationId\s*\|\|\s*req\.user\?\.tenantId/.test(controller)],
 ['missing tenant claim is rejected', /throw new UnauthorizedException/.test(controller)],
 ['request body is not used to choose tenant identity', !/tenantId\s*=\s*body\./.test(controller)],
 ['audit documents static checks are not runtime proof', fs.existsSync(path.join(root,'PHASE173_NOTES.md')) && fs.readFileSync(path.join(root,'PHASE173_NOTES.md'),'utf8').includes('not runtime proof')],
 ['phase 173 npm commands are present', (()=>{const p=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8')); return !!p.scripts['test:phase173:contract'] && !!p.scripts['audit:phase173:registry-tenant-scope'];})()],
];
let failed=0; for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`Phase 173 registry tenant-scope contract tests: ${checks.length-failed}/${checks.length} passed`);
if(failed) process.exitCode=1;
