#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const audit=fs.readFileSync(path.join(__dirname,'phase172-tenant-data-access-audit.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const checks=[
 ['audit labels itself read-only and heuristic',audit.includes("mode:'read-only heuristic source inventory'")],
 ['walks service and controller TypeScript files',audit.includes("/\\.(service|controller)\\.ts$/")],
 ['checks common database read/write operations',audit.includes('queryRe')&&audit.includes('updateMany')&&audit.includes('deleteMany')&&audit.includes('aggregate')],
 ['records visible tenant/organization signals',audit.includes('tenantId|organizationId|organization|tenant|req\\.user|currentTenant')],
 ['reports review findings without declaring confirmed vulnerabilities',audit.includes('REVIEW REQUIRED')&&audit.includes('does not prove a vulnerability')],
 ['denies production clearance by default',audit.includes("overall:'NOT CLEARED FOR PRODUCTION'")],
 ['writes a machine-readable report',audit.includes('PHASE172_TENANT_DATA_ACCESS_REPORT.json')&&audit.includes('JSON.stringify(report,null,2)')],
 ['does not connect to or mutate database',!/mongoose\.connect|\.save\(|\.deleteMany\(|\.updateMany\(/.test(audit)],
 ['documents need for live cross-tenant read/write tests',audit.includes('live cross-tenant read/write tests')],
 ['exposes phase 172 npm commands',!!pkg.scripts['audit:phase172:tenant-data-access']&&!!pkg.scripts['test:phase172:contract']],
 ['preserves phase 171 commands',!!pkg.scripts['test:phase171:contract']&&!!pkg.scripts['audit:phase171:security-readiness']],
 ['preserves phase 170 commands',!!pkg.scripts['test:phase170:contract']&&!!pkg.scripts['probe:phase170:authorization']],
]; let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;} console.log(`Phase 172 contract tests: ${checks.length-fail}/${checks.length} passed`); if(fail)process.exitCode=1;
