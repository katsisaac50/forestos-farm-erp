#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(__dirname,'phase118-route-service-remediation-matrix.js'),'utf8');
const notes=fs.readFileSync(path.join(base,'PHASE118_NOTES.md'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(base,'apps/api/package.json'),'utf8'));
const workflow=fs.readFileSync(path.join(base,'.github/workflows/tenant-security-regression.yml'),'utf8');
const checks=[
 ['requires Phase 116 route inventory',script.includes('PHASE116_TENANT_ROUTE_AUDIT.json')],
 ['requires Phase 117 service query report',script.includes('PHASE117_SERVICE_TENANT_QUERY_AUDIT.json')],
 ['maps controller route inventory',script.includes('routeReport.controllers')],
 ['links same-directory service candidates',script.includes('sameDirectoryServiceCandidates')],
 ['labels same-directory mapping as heuristic',script.includes('not a confirmed call graph')],
 ['prioritizes route and service review',script.includes('P1_ROUTE_AND_SERVICE_REVIEW')],
 ['includes trusted membership context requirement',script.includes('authenticated active membership')],
 ['includes cross-tenant integration tests',script.includes('cross-tenant integration tests')],
 ['defines closure criteria',script.includes('closureCriteria')],
 ['states no production certification',script.includes('NOT_A_SECURITY_FINDING_OR_PRODUCTION_CERTIFICATION')],
 ['package audit command exists',Boolean(pkg.scripts['audit:phase118:remediation-matrix'])],
 ['package contract command exists',Boolean(pkg.scripts['test:phase118:contract'])],
 ['CI executes Phase 118 contract',workflow.includes('phase118-route-service-contract-tests.js')],
 ['notes explain static-only boundary',/static heuristic|not a confirmed call graph/i.test(notes)]
];
let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++;}
console.log(`Phase 118 contract checks: ${checks.length-failed}/${checks.length} passed.`);
if(failed)process.exitCode=1;
