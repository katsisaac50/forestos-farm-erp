#!/usr/bin/env node
'use strict';
// Focused source-level audit of the registry persistence tenant boundary. Not runtime proof.
const fs=require('node:fs'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const servicePath=path.join(root,'apps/api/src/registry-persistence/registry-persistence.service.ts');
const controllerPath=path.join(root,'apps/api/src/registry-persistence/registry-persistence.controller.ts');
const service=fs.readFileSync(servicePath,'utf8'); const controller=fs.readFileSync(controllerPath,'utf8');
const checks=[
 {id:'REG-TENANT-001',control:'record snapshot read scoped by tenantId',passed:/this\.records\.find\(\{\s*tenantId\s*\}\)/.test(service)},
 {id:'REG-TENANT-002',control:'record update filter includes tenantId + domain + recordId',passed:/this\.records\.updateOne\(\s*\{\s*tenantId,\s*domain:\s*doc\.domain,\s*recordId:\s*doc\.recordId/.test(service)},
 {id:'REG-TENANT-003',control:'batch idempotency lookup scoped by tenantId',passed:/this\.commits\.findOne\(\{\s*tenantId,\s*kind:\s*'batch',\s*batchHash\s*\}\)/.test(service)},
 {id:'REG-TENANT-004',control:'revision lookup and update scoped by tenantId',passed:/this\.commits\.findOne\(\{\s*tenantId,\s*kind:\s*'revision'\s*\}\)/.test(service)&&/this\.commits\.updateOne\(\s*\{\s*tenantId,\s*kind:\s*'revision'\s*\}/.test(service)},
 {id:'REG-TENANT-005',control:'tenant identity comes from authenticated claims',passed:/req\.user\?\.organizationId\s*\|\|\s*req\.user\?\.tenantId/.test(controller)&&!/tenantId\s*=\s*body\./.test(controller)},
 {id:'REG-TENANT-006',control:'transaction session is used for core writes',passed:/this\.records\.updateOne\([\s\S]*?\{\s*upsert:\s*doc\.version\s*===\s*1,\s*session,\s*runValidators:\s*true\s*\}/.test(service)&&/this\.commits\.create\(\[commit\],\s*\{\s*session\s*\}\)/.test(service)},
];
const report={phase:173,title:'Critical Registry Query Tenant-Scope Review',mode:'focused static source inspection',generatedAt:new Date().toISOString(),overall:'NOT CLEARED FOR PRODUCTION',summary:{checks:checks.length,sourceSignalsPassing:checks.filter(x=>x.passed).length,sourceSignalsMissing:checks.filter(x=>!x.passed).length},checks:checks.map(x=>({...x,status:x.passed?'SOURCE SIGNAL PRESENT':'REVIEW REQUIRED'})),limitations:['These checks inspect source patterns and do not execute the API or database.','A source signal does not prove query semantics, authorization correctness, or absence of indirect data leaks.','Runtime cross-tenant read/write tests and full security review remain required.','The current registry controller has no explicit local role decorator visible; confirm the global guard and role policy before production.']};
fs.writeFileSync(path.join(root,'PHASE173_REGISTRY_TENANT_SCOPE_REPORT.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Phase 173 focused registry audit: ${report.summary.sourceSignalsPassing}/${checks.length} source signals present; ${report.summary.sourceSignalsMissing} require review.`);
console.log('Overall: NOT CLEARED FOR PRODUCTION (static source inspection only).');
