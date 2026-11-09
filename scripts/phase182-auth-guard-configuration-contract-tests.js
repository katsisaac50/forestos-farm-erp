#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');
const audit=fs.readFileSync(path.join(root,'scripts/phase182-auth-guard-configuration-audit.js'),'utf8');
const report=JSON.parse(fs.readFileSync(path.join(root,'PHASE182_AUTH_GUARD_CONFIGURATION_AUDIT.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const checks=[
['audit inspects NestJS APP_GUARD configuration',/APP_GUARD/.test(audit)&&report.findings.globalGuardProviderConfigured],
['audit distinguishes source signals from runtime proof',/Static source inspection/.test(report.method)&&/does not validate runtime/.test(report.interpretation.join(' '))],
['invalid token handling is inventoried',report.findings.authGuardRejectsInvalidToken],
['role metadata enforcement is inventoried',report.findings.authGuardChecksRoleMetadata],
['public route bypass is explicitly inventoried',report.findings.publicDecoratorBypassesGuard],
['all @Public annotations are enumerated',Array.isArray(report.publicRouteAnnotations)&&report.counts.publicAnnotations===report.publicRouteAnnotations.length],
['JWT secret configuration risk is documented',/JWT_SECRET/.test(report.requiredActions.join(' '))],
['tenant membership validation remains required',/organization membership/.test(report.requiredActions.join(' '))],
['cross-tenant HTTP tests remain required',/cross-tenant read\/write/.test(report.requiredActions.join(' '))],
['no credentials or network calls are embedded',!/fetch\s*\(|axios\.|mongodb:\/\//.test(audit)],
['production clearance remains blocked',report.productionClearance==='NOT CLEARED FOR PRODUCTION'],
['phase commands are registered',!!pkg.scripts['test:phase182:contract']&&!!pkg.scripts['audit:phase182:auth']],
['README documents Phase 182',/Phase 182 — Authentication Guard Configuration/.test(readme)],
['report is marked phase 182',report.phase===182]
];let failed=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failed++;}console.log(`Phase 182 contract tests: ${checks.length-failed}/${checks.length} passed`);if(failed)process.exitCode=1;
