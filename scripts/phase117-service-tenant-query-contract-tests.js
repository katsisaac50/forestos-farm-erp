#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname,'..');
const script = fs.readFileSync(path.join(__dirname,'phase117-service-tenant-query-audit.js'),'utf8');
const notes = fs.readFileSync(path.join(base,'PHASE117_NOTES.md'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(base,'apps/api/package.json'),'utf8'));
const workflow = fs.readFileSync(path.join(base,'.github/workflows/tenant-security-regression.yml'),'utf8');
const checks = [
 ['scanner limits itself to service files', /endsWith\('\.service\.ts'\)/.test(script)],
 ['scanner counts read query markers', /databaseRead/.test(script)],
 ['scanner counts write query markers', /databaseWrite/.test(script)],
 ['scanner checks organization field signals', /organizationFieldMentions/.test(script)],
 ['scanner checks context signals', /organizationContextMentions/.test(script)],
 ['scanner emits prioritized queue', /P1_REVIEW/.test(script) && /P2_REVIEW/.test(script)],
 ['scanner states static-only limitation', /static triage only/i.test(script)],
 ['manual route/query review required', /Trace each controller route/.test(script)],
 ['contract command exists', Boolean(pkg.scripts['test:phase117:contract'])],
 ['audit command exists', Boolean(pkg.scripts['audit:phase117:tenant-queries'])],
 ['CI runs Phase 117 contract', /phase117-service-tenant-query-contract-tests\.js/.test(workflow)],
 ['notes avoid security certification claim', /not a security certification/i.test(notes)],
];
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) process.exitCode=1; }
console.log(`${checks.filter(x=>x[1]).length}/${checks.length} checks passed`);
