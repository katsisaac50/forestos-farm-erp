#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'); const root=path.resolve(__dirname,'..');
const runner=fs.readFileSync(path.join(__dirname,'phase161-live-tenant-isolation-probe.js'),'utf8'); const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8')); const readme=fs.readFileSync(path.join(root,'README.md'),'utf8'); const checks=[];
function check(n,v){checks.push({name:n,passed:!!v});}
check('Probe uses GET only',runner.includes("method: 'GET'"));
check('Probe is opt-in and skips without config',runner.includes('const missing = required.filter')&&runner.includes("'SKIP'"));
check('Requires distinct tenant IDs and tokens',runner.includes('Distinct test identities'));
check('Prevents cross-origin endpoint paths',runner.includes('target.origin !== base.origin'));
check('Does not print tokens or response bodies',!runner.includes('console.log(token)')&&!runner.includes('console.log(JSON.stringify(body'));
check('Checks both cross-tenant identifier directions',runner.includes('Tenant A response excludes Tenant B identifiers')&&runner.includes('Tenant B response excludes Tenant A identifiers'));
check('Writes machine-readable report',runner.includes('PHASE161_TENANT_ISOLATION_REPORT.json'));
check('API package exposes test command',pkg.scripts&&pkg.scripts['test:phase161:contract']==='node ../../scripts/phase161-tenant-isolation-probe-contract-tests.js');
check('README documents phase and limitations',readme.includes('Phase 161 — Live API Tenant Isolation Probe'));
for(const c of checks) console.log(`${c.passed?'PASS':'FAIL'} ${c.name}`); console.log(`Phase 161 contract tests: ${checks.filter(c=>c.passed).length}/${checks.length} passed.`); if(checks.some(c=>!c.passed))process.exitCode=1;
