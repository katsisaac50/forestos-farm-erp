#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');
const auditPath=path.join(root,'scripts/phase183-public-route-and-jwt-startup-gate.js');
require('./phase183-public-route-and-jwt-startup-gate.js');
const audit=fs.readFileSync(auditPath,'utf8');
const report=JSON.parse(fs.readFileSync(path.join(root,'PHASE183_PUBLIC_ROUTE_JWT_STARTUP_GATE.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const checks=[
['public routes are enumerated from TypeScript source',Array.isArray(report.publicRoutes)&&report.counts.publicAnnotations===report.publicRoutes.length],
['every public route requires human approval',report.publicRoutes.every(r=>r.reviewStatus==='REQUIRES_HUMAN_APPROVAL')],
['public route records include source file and line',report.publicRoutes.every(r=>typeof r.file==='string'&&Number.isInteger(r.line))],
['public route review asks about tenant-sensitive effects',report.publicRoutes.every(r=>r.reviewQuestions.some(q=>/tenant-scoped data/.test(q)))],
['route review asks for owner and reason',report.publicRoutes.every(r=>report.requiredActions.some(a=>/owner and documented business justification/.test(a)))],
['JWT startup safety is explicitly assessed',typeof report.jwtStartupReview.evidenceOfExplicitMissingSecretStartupFailure==='boolean'],
['production secret gate is separately assessed',typeof report.jwtStartupReview.evidenceOfProductionSpecificSecretGate==='boolean'],
['static findings are not represented as runtime proof',/Static source inspection only/.test(report.method)&&/Static regular-expression checks are indicators only/.test(report.jwtStartupReview.note)],
['live HTTP auth tests remain required',report.requiredActions.some(a=>/live HTTP requests/.test(a))],
['tenant authorization remains a separate requirement',report.requiredActions.some(a=>/tenant-scoped reads and writes/.test(a))],
['no network/database calls or automatic source edits are claimed',/No source code is automatically changed/.test(report.method)&&!/fetch\s*\(|axios\.|mongodb:\/\//.test(audit)],
['production clearance remains blocked',report.productionClearance==='NOT CLEARED FOR PRODUCTION'],
['phase commands are registered',!!pkg.scripts['test:phase183:contract']&&!!pkg.scripts['audit:phase183:public-routes']],
['README documents Phase 183',/Phase 183 — Public Route Review/.test(readme)],
['report is marked phase 183',report.phase===183]
];let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}console.log(`Phase 183 contract tests: ${checks.length-failed}/${checks.length} passed`);if(failed)process.exitCode=1;
