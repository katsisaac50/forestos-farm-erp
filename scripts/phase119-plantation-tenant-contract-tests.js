#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const probe=fs.readFileSync(path.join(__dirname,'phase119-plantation-tenant-read-probe.js'),'utf8');
const controller=fs.readFileSync(path.join(base,'apps/api/src/plantations/plantations.controller.ts'),'utf8');
const service=fs.readFileSync(path.join(base,'apps/api/src/plantations/plantations.service.ts'),'utf8');
const scope=fs.readFileSync(path.join(base,'apps/api/src/organizations/organization-scope.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(base,'apps/api/package.json'),'utf8'));
const workflow=fs.readFileSync(path.join(base,'.github/workflows/tenant-security-regression.yml'),'utf8');
const notes=fs.readFileSync(path.join(base,'PHASE119_NOTES.md'),'utf8');
const checks=[
 ['probe defaults to read-only GET requests',probe.includes("const endpoints=['plantations','plantations/intelligence']")&&!/method:\s*['"](POST|PATCH|PUT|DELETE)/i.test(probe)],
 ['probe blocks nonlocal targets by default',probe.includes('Non-local target blocked')],
 ['requires distinct organization IDs',probe.includes('config.A.org===config.B.org')],
 ['requires distinct seeded markers',probe.includes('config.A.marker===config.B.marker')],
 ['sends bearer authorization and organization header',probe.includes('authorization:')&&probe.includes('x-organization-id')],
 ['checks own marker visibility',probe.includes('includes its seeded marker')],
 ['checks cross-tenant marker absence',probe.includes('excludes other tenant marker')],
 ['controller resolves trusted organization context',controller.includes('this.organizationAccess.resolveContext')],
 ['list query uses organization filter',/findAll[\s\S]*organizationFilter\(context\)/.test(service)],
 ['intelligence query scopes plantation blocks',/intelligence[\s\S]*model\.find\(organizationFilter\(context\)\)/.test(service)],
 ['growth sample query is organization scoped',/growth\.find\(organizationFilter\(context,\s*\{ blockId: b\.blockId \}\)\)/.test(service)],
 ['organization scope helper exists',scope.includes('organizationFilter')],
 ['package live probe command exists',Boolean(pkg.scripts['test:phase119:live'])],
 ['package contract command exists',Boolean(pkg.scripts['test:phase119:contract'])],
 ['CI runs Phase 119 contract',workflow.includes('phase119-plantation-tenant-contract-tests.js')],
 ['notes state limited scope and no certification',/do not prove whole-application tenant isolation/i.test(notes)]
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++;}
console.log(`Phase 119 contract checks: ${checks.length-failed}/${checks.length} passed.`);if(failed)process.exitCode=1;
