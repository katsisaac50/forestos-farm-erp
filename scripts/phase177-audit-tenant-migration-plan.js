#!/usr/bin/env node
'use strict';
// Phase 177: read-only migration planner. Does not connect to MongoDB or modify application source.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.existsSync(path.join(root,p)) ? fs.readFileSync(path.join(root,p),'utf8') : '';
const auditSchema = read('apps/api/src/audit/audit.schema.ts');
const auditService = read('apps/api/src/audit/audit.service.ts');
const financialSchema = read('apps/api/src/financial-audit-trail/financial-audit-trail.schema.ts');
const financialService = read('apps/api/src/financial-audit-trail/financial-audit-trail.service.ts');
const auditCallSites = [];
const apiSrc = path.join(root,'apps/api/src');
function walk(dir){ for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(/\.ts$/.test(e.name)){const s=fs.readFileSync(p,'utf8'); const re=/\.record\s*\(/g; let m; while((m=re.exec(s))) auditCallSites.push(path.relative(root,p));}}}
if(fs.existsSync(apiSrc)) walk(apiSrc);
const uniqueCallSites = [...new Set(auditCallSites)].sort();
const phases = [
 {id:'MIG177-01',name:'Inventory and baseline',status:'PLANNED',actions:['Back up audit collections and record counts/indexes','Inventory every AuditService.record call site and financial snapshot source','Agree tenant ownership source for each source model'],exitCriteria:['Reviewed call-site inventory','Approved source-of-truth mapping']},
 {id:'MIG177-02',name:'Schema compatibility',status:'PLANNED',actions:['Add optional tenantId to operational and financial audit schemas in a separate reviewed code change','Add compound indexes only after checking query patterns and duplicate/index build impact','Keep legacy entries readable while ownership remains unresolved'],exitCriteria:['Schema review approved','Index plan tested against representative data']},
 {id:'MIG177-03',name:'Explicit tenant context',status:'PLANNED',actions:['Introduce a typed audit context carrying authenticated tenantId and actor ID','Update each writer to pass validated tenant context; do not infer tenant from email','Trace financial snapshot tenantId from verified source records'],exitCriteria:['All writer call sites classified','Missing-context behavior explicitly defined and tested']},
 {id:'MIG177-04',name:'Backfill and reconciliation',status:'PLANNED',actions:['Backfill only records whose tenant can be deterministically established from authoritative source data','Mark ambiguous legacy records as unresolved in a controlled migration ledger; never guess','Run dry-run counts, duplicate checks, and tenant distribution reconciliation'],exitCriteria:['Dry-run reviewed','Unresolved records accounted for','Rollback/restore procedure rehearsed']},
 {id:'MIG177-05',name:'Tenant-scoped reads and authorization',status:'PLANNED',actions:['Require authenticated tenant scope for list/read endpoints','Enforce role policy and tenant scope server-side, not from client-supplied tenant IDs','Add cross-tenant read/write and role-negative runtime tests'],exitCriteria:['Runtime tests pass in disposable environment','No unscoped audit list path remains']},
 {id:'MIG177-06',name:'Controlled enforcement and release',status:'PLANNED',actions:['Deploy compatible schema first, then writers, then verified backfill, then scoped reads','Monitor missing-tenant events and reconciliation metrics','Only make tenant attribution required after all writers and legacy rows are reconciled'],exitCriteria:['Production build passes','Migration verification passes','Security review signs off']}
];
const checks = [
 {id:'SRC-01',name:'Operational audit schema has visible tenant field',status:/tenantId|organizationId/.test(auditSchema)?'SIGNAL_PRESENT':'REVIEW_REQUIRED'},
 {id:'SRC-02',name:'Operational audit writer accepts explicit tenant context',status:/tenantId|organizationId/.test(auditService)&&/record\([^)]*tenantId|record\([^)]*context/i.test(auditService)?'SIGNAL_PRESENT':'REVIEW_REQUIRED'},
 {id:'SRC-03',name:'Operational audit listing applies tenant filter',status:/find\(\s*\{[^}]*tenantId|find\(\s*\{[^}]*organizationId/.test(auditService)?'SIGNAL_PRESENT':'REVIEW_REQUIRED'},
 {id:'SRC-04',name:'Financial audit schema has visible tenant field',status:/tenantId|organizationId/.test(financialSchema)?'SIGNAL_PRESENT':'REVIEW_REQUIRED'},
 {id:'SRC-05',name:'Financial audit service shows tenant-context signal',status:/tenantId|organizationId/.test(financialService)?'SIGNAL_PRESENT':'REVIEW_REQUIRED'},
 {id:'SRC-06',name:'Call-site inventory was collected',status:uniqueCallSites.length?'SIGNAL_PRESENT':'REVIEW_REQUIRED'}
];
const reviewRequired = checks.filter(c=>c.status==='REVIEW_REQUIRED').length;
const report = {phase:177,title:'Tenant-Aware Audit Architecture & Migration Planning',generatedAt:new Date().toISOString(),mode:'read-only source inspection and migration planning',decision:'NOT CLEARED FOR PRODUCTION',summary:{checks:checks.length,signalsPresent:checks.length-reviewRequired,reviewRequired,uniqueAuditWriterCallSiteFiles:uniqueCallSites.length},sourceChecks:checks,writerCallSiteFiles:uniqueCallSites,migrationStages:phases,legacyDataPolicy:{rule:'Never infer tenant ownership from actor email or incomplete metadata.',knownTenant:'Backfill only from an authoritative, deterministic source with reconciliation evidence.',unknownTenant:'Leave unresolved, quarantine from tenant-scoped views, and route to an approved manual reconciliation workflow.',destructiveChanges:'No schema field is made required and no data is changed by this planner.'},limitations:['Read-only static inspection; no database connection, API execution, migration, or production build was performed.','A source signal is not proof of runtime enforcement.','Call-site file inventory does not count or prove the correctness of every call path.','Migration stages are a plan requiring engineering, security, data-owner, and operational approval.']};
const out=path.join(root,'PHASE177_AUDIT_TENANT_MIGRATION_PLAN.json'); fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(`Phase 177 source checks: ${checks.length-reviewRequired}/${checks.length} signals present; ${reviewRequired} require review.`);
console.log(`Unique audit writer call-site files inventoried: ${uniqueCallSites.length}`);
console.log(`Decision: ${report.decision}`); console.log(`Report written: ${path.relative(root,out)}`);
