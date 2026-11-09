#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const audit=fs.readFileSync(path.join(root,'scripts/phase176-audit-trail-integrity-audit.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.schema.ts'),'utf8');
const service=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.service.ts'),'utf8');
const controller=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.controller.ts'),'utf8');
const financialSchema=fs.readFileSync(path.join(root,'apps/api/src/financial-audit-trail/financial-audit-trail.schema.ts'),'utf8');
const financialService=fs.readFileSync(path.join(root,'apps/api/src/financial-audit-trail/financial-audit-trail.service.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const notes=fs.readFileSync(path.join(root,'PHASE176_NOTES.md'),'utf8');
const checks=[
 ['audit is read-only and performs no database writes',/Read-only source audit/.test(audit)&&!/mongoose|mongodb|fetch\(/i.test(audit)],
 ['audit inspects generic audit schema',/apps\/api\/src\/audit\/audit\.schema\.ts/.test(audit)],
 ['audit checks tenant identity on generic events',/Generic audit event tenant identity/.test(audit)&&/tenantId|organizationId/.test(audit)],
 ['audit checks tenant scoping of generic listing',/Generic audit listing scope/.test(audit)&&/find\(/.test(service)],
 ['audit checks append-only signals without claiming proof',/Audit event append-only protections/.test(audit)&&/SIGNAL_PRESENT does not prove/.test(audit+notes)],
 ['audit checks route authorization signal',/Audit listing authorization signal/.test(audit)&&/@Roles\('owner'\)/.test(controller)],
 ['audit checks financial audit tenant attribution',/Financial audit tenant identity/.test(audit)&&!/tenantId|organizationId/.test(financialSchema)],
 ['audit checks financial snapshot query scoping',/Financial snapshot query scoping/.test(audit)&&/syncSnapshotEvents/.test(financialService)],
 ['audit checks sensitive detail minimization',/Sensitive audit details minimization/.test(audit)],
 ['report clearly marks production not cleared when review findings exist',/NOT CLEARED FOR PRODUCTION/.test(audit)],
 ['report includes limitations and summary',/limitations:/.test(audit)&&/reviewRequired/.test(audit)],
 ['notes warn against guessing tenant identity',/Do not infer tenant identity from actor email/.test(notes)],
 ['notes warn that source checks are not runtime proof',/does not execute the NestJS API.*?verify runtime permissions/is.test(notes.replace(/\n/g,' '))],
 ['npm contract and audit commands are registered',!!pkg.scripts['test:phase176:contract']&&!!pkg.scripts['audit:phase176:trail-integrity']],
 ['existing audit writer API remains unchanged in this phase',/record\(actorEmail:string,action:string,entityType:string,entityId:string,summary:string,metadata\?/.test(service)],
 ['no tokens or secrets are emitted by the audit report',!/console\.log\([^\n]*(?:process\.env|authorization|bearer)/i.test(audit)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}console.log(`Phase 176 audit-trail contract tests: ${checks.length-failed}/${checks.length} passed`);if(failed)process.exitCode=1;
