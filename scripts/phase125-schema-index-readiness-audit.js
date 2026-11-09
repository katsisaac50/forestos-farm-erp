#!/usr/bin/env node
'use strict';
// Phase 125: read-only static inspection of schema/index migration readiness.
// This script does not connect to MongoDB and never mutates application data.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const targets = [
  {domain:'sales', file:'apps/api/src/sales/sales.schema.ts', model:'SalesOrder', tenantField:'organizationId', keyField:'orderId'},
  {domain:'inventory', file:'apps/api/src/inventory/inventory.schema.ts', model:'InventoryItem', tenantField:'organizationId', keyField:'itemId'},
  {domain:'inventory-control', file:'apps/api/src/inventory-control/inventory.schema.ts', model:'StockItem', tenantField:'organizationId', keyField:'itemCode'}
];
const findings = [];
for (const t of targets) {
  const full = path.join(root, t.file);
  if (!fs.existsSync(full)) {
    findings.push({severity:'P1', code:'SCHEMA_FILE_MISSING', ...t, detail:'Expected schema file was not found.'});
    continue;
  }
  const s = fs.readFileSync(full, 'utf8');
  const hasTenant = new RegExp(`@Prop\\([^)]*\\b${t.tenantField}\\b`).test(s) ||
    new RegExp(`\\b${t.tenantField}\\s*[!?]?:`).test(s);
  const compound = s.includes(`{${t.tenantField}:1,${t.keyField}:1}`) ||
    s.includes(`{ ${t.tenantField}: 1, ${t.keyField}: 1 }`) ||
    (s.includes(t.tenantField) && s.includes(t.keyField) &&
     new RegExp(`index\\s*\\(\\s*\\{[^}]*${t.tenantField}[^}]*${t.keyField}[^}]*\\}`).test(s));
  const globalUnique = new RegExp(`@Prop\\([^)]*\\bunique\\s*:\\s*true[^)]*\\)[^\\n]*\\b${t.keyField}\\b`).test(s) ||
    new RegExp(`@Prop\\([^)]*\\bunique\\s*:\\s*true[^)]*\\)[^\\n]*\\bitemCode\\b`).test(s);
  if (!hasTenant) findings.push({severity:'P1',code:'TENANT_FIELD_NOT_VISIBLE',...t,detail:'No recognizable tenant ownership field found; verify whether this model is tenant-owned or intentionally global.'});
  if (!compound) findings.push({severity:'P1',code:'TENANT_COMPOUND_UNIQUE_INDEX_NOT_VISIBLE',...t,detail:`No recognizable compound index for ${t.tenantField} + ${t.keyField}; verify intended uniqueness and query patterns.`});
  if (globalUnique) findings.push({severity:'P1',code:'GLOBAL_UNIQUE_FIELD',...t,detail:`A globally unique field declaration may conflict with tenant-local identifiers; inspect existing MongoDB indexes and data before changing it.`});
  findings.push({severity:'INFO',code:'STATIC_SCHEMA_REVIEW',...t,detail:'Source-pattern heuristic only; not a live MongoDB index inventory.'});
}
const report = {
  phase:125,
  title:'MongoDB Schema and Index Migration Readiness',
  generatedAt:new Date().toISOString(),
  mode:'static-read-only',
  databaseConnection:false,
  dataMutation:false,
  targets:targets.map(t=>({domain:t.domain,file:t.file,model:t.model})),
  findings,
  mandatoryPreflight:[
    'Take and verify a restorable database backup.',
    'Capture actual collection indexes using listIndexes in a secured non-production environment.',
    'Detect duplicate candidate keys before creating compound unique indexes.',
    'Confirm every tenant-owned record has verified organization ownership.',
    'Rehearse index creation and rollback on a restored non-production copy.',
    'Never drop a global unique index until replacement semantics and duplicate checks are approved.'
  ],
  caveat:'Static source scan only. Findings are review flags, not confirmed production defects.'
};
const outPath = path.join(root,'PHASE125_SCHEMA_INDEX_READINESS.json');
fs.writeFileSync(outPath, JSON.stringify(report,null,2)+'\\n');
const counts = findings.reduce((a,f)=>(a[f.severity]=(a[f.severity]||0)+1,a),{});
console.log(JSON.stringify({report:outPath, targets:targets.length, findings:findings.length, counts, mode:report.mode},null,2));
