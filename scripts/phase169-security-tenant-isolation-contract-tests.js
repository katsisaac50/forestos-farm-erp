#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const root=path.join(__dirname,'..');
const audit=fs.readFileSync(path.join(__dirname,'phase169-security-tenant-isolation-audit.js'),'utf8');
const registry=fs.readFileSync(path.join(root,'apps/api/src/registry-persistence/registry-persistence.controller.ts'),'utf8');
const checks=[
 ['creates a machine-readable security audit report',audit.includes('PHASE169_SECURITY_TENANT_ISOLATION_AUDIT.json')&&audit.includes('JSON.stringify(report,null,2)')],
 ['inventories HTTP controller routes',audit.includes("endsWith('.controller.ts')")&&audit.includes('@(Get|Post|Put|Patch|Delete)')],
 ['checks visible guard signals',audit.includes('hasGuardOrRoleDecorator')&&audit.includes('@UseGuards')],
 ['checks visible role policy signals',audit.includes('hasRolePolicyReference')&&audit.includes('@Roles')],
 ['checks visible tenant context signals',audit.includes('hasTenantContextReference')&&audit.includes('OrganizationAccessService')],
 ['records registry tenant claim derivation',audit.includes('derivesTenantFromRequestUser')&&/req\\\.user/.test(audit)],
 ['records missing tenant claim rejection',registry.includes('UnauthorizedException')&&registry.includes('Session has no organization/tenant claim')],
 ['does not falsely certify static checks as runtime proof',audit.includes('not security certification')&&audit.includes('does not execute guards')],
 ['flags missing explicit registry role policy for review',audit.includes('explicitRoleDecoratorPresent')&&audit.includes('NOT VISIBLE — REVIEW REQUIRED')],
 ['lists cross-tenant runtime tests as manual requirement',audit.includes('tenant A cannot read or mutate tenant B records')],
 ['lists secret and production configuration review',audit.includes('secrets, CORS, rate limits')],
 ['writes audit report without modifying application data',audit.includes('writeFileSync(out,JSON.stringify(report,null,2)')&&!audit.includes('mongoose.connect')],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`Phase 169 security audit contract tests: ${checks.length-failed}/${checks.length} passed`);if(failed)process.exitCode=1;
