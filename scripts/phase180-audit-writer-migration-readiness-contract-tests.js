#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path'); const root=path.resolve(__dirname,'..');
const audit=fs.readFileSync(path.join(root,'scripts/phase180-audit-writer-migration-readiness.js'),'utf8');
const service=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.service.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const checks=[
 ['readiness scan enumerates legacy audit calls',audit.includes('record')],
 ['report marks context signals as non-proof',/not proof of trusted context/.test(audit)],
 ['conversion requires validated membership context',/validated organization\/tenant context is derived from authenticated membership/.test(audit)],
 ['tenant must not be inferred from actor email',/actor email/.test(audit)],
 ['tenant must not be inferred from request body',/DTO\/request body/.test(audit)],
 ['system events require explicit scope policy',/global-event policy/.test(audit)],
 ['legacy audit writer remains documented',/Events written here have no tenantId/.test(service)],
 ['phase 180 contract command registered',!!pkg.scripts['test:phase180:contract']],
 ['phase 180 readiness command registered',!!pkg.scripts['audit:phase180:readiness']],
 ['README documents phase 180 gate',/Phase 180 — Audit Writer Migration Readiness/.test(readme)],
 ['scan is static and does not connect to a database',!/mongoose\.connect|MongoClient/.test(audit)],
 ['production remains uncleared in documentation',/NOT CLEARED FOR PRODUCTION/.test(audit)],
]; let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;} console.log(`Phase 180 contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed)process.exitCode=1;
