#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const planner=fs.readFileSync(path.join(root,'scripts/phase177-audit-tenant-migration-plan.js'),'utf8');
const reportPath=path.join(root,'PHASE177_AUDIT_TENANT_MIGRATION_PLAN.json');
require('./phase177-audit-tenant-migration-plan.js');
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const notes=fs.readFileSync(path.join(root,'PHASE177_NOTES.md'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const checks=[
 ['planner is explicitly read-only',/read-only migration planner/.test(planner)&&!/mongoose\.connect|MongoClient|\.save\(|\.updateOne\(|\.deleteMany\(/.test(planner)],
 ['report declares production uncleared',report.decision==='NOT CLEARED FOR PRODUCTION'],
 ['report identifies itself as planning, not execution',report.mode.includes('planning')],
 ['migration has staged phases',report.migrationStages.length>=6],
 ['schema compatibility precedes enforcement',report.migrationStages.findIndex(x=>x.id==='MIG177-02')<report.migrationStages.findIndex(x=>x.id==='MIG177-05')],
 ['tenant context must be explicit',report.migrationStages.some(x=>x.actions.some(a=>/typed audit context/i.test(a)))],
 ['email is not accepted as tenant identity',/Never infer tenant ownership from actor email/.test(report.legacyDataPolicy.rule)],
 ['unknown legacy tenant records remain unresolved',/Leave unresolved/.test(report.legacyDataPolicy.unknownTenant)],
 ['no automatic destructive migration occurs',/no data is changed/.test(report.legacyDataPolicy.destructiveChanges)],
 ['call-site inventory is reported',Array.isArray(report.writerCallSiteFiles)&&Number.isInteger(report.summary.uniqueAuditWriterCallSiteFiles)],
 ['operational schema and writer are inspected',/audit\.schema\.ts/.test(planner)&&/audit\.service\.ts/.test(planner)],
 ['financial schema and writer are inspected',/financial-audit-trail\.schema\.ts/.test(planner)&&/financial-audit-trail\.service\.ts/.test(planner)],
 ['report contains explicit limitations',report.limitations.length>=4],
 ['notes warn about static evidence limitations',/does not connect to MongoDB|does not.*database/i.test(notes)],
 ['npm commands registered',!!pkg.scripts['test:phase177:contract']&&!!pkg.scripts['plan:phase177:audit-migration']],
 ['no credential values are emitted by planner',!/console\.log\([^\n]*(?:process\.env|authorization|bearer|token)/i.test(planner)]
];let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}console.log(`Phase 177 migration-planning contract tests: ${checks.length-fail}/${checks.length} passed`);if(fail)process.exitCode=1;
