#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'apps/api/src');
const files = [];
function walk(dir) { for (const ent of fs.readdirSync(dir, {withFileTypes:true})) { const full=path.join(dir,ent.name); if(ent.isDirectory()) walk(full); else if(ent.isFile() && ent.name.endsWith('.ts') && !ent.name.endsWith('.spec.ts')) files.push(full); } }
walk(srcRoot);
const rows=[];
for(const file of files){
 const text=fs.readFileSync(file,'utf8');
 const re=/\.audit\.record\s*\(/g; let m;
 while((m=re.exec(text))){
  const line=text.slice(0,m.index).split('\n').length;
  const rel=path.relative(root,file).split(path.sep).join('/');
  const hasContext=/OrganizationContext|requireOrganizationContext|organizationId|tenantId/.test(text);
  rows.push({file:rel,line,writer:'legacy record()',contextSignal:hasContext?'PRESENT_REQUIRES_CALL_CHAIN_REVIEW':'NOT_FOUND_IN_SERVICE_FILE',requiredAction:'Trace controller authentication and organization membership; pass validated tenant context explicitly before conversion.'});
 }
}
const grouped={}; for(const r of rows){(grouped[r.file]??=[]).push(r);}
const report={phase:180,title:'Audit Writer Migration Readiness & Trusted Context Gate',status:'PARTIAL_REMEDIATION_REQUIRED_NOT_CLEARED_FOR_PRODUCTION',method:'Static source scan. Context signals are not proof of trusted context at each call site.',summary:{legacyCallSites:rows.length,filesWithLegacyCallSites:Object.keys(grouped).length,filesWithContextSignals:[...new Set(rows.filter(r=>r.contextSignal==='PRESENT_REQUIRES_CALL_CHAIN_REVIEW').map(r=>r.file))].length,convertedCallSitesSincePhase179:0},policy:{convertOnlyWhen:'A validated organization/tenant context is derived from authenticated membership and explicitly passed to recordForTenant().',neverInferTenantFrom:['actor email','DTO/request body','free-form metadata','resource ID without scoped lookup'],systemEvents:'System events need an explicit trusted tenant scope or a deliberately designed global-event policy; do not use a fake actor/tenant.'},callSites:rows,limitations:['Static text scan may miss aliased or indirect audit writers.','Presence of tenant-related terms does not prove call-site trust or resource ownership.','No automatic code conversion was performed because current legacy signatures do not consistently carry validated tenant context.','Live database, HTTP authorization, and production build tests were not run.'],productionClearance:'NOT CLEARED FOR PRODUCTION'};
fs.writeFileSync(path.join(root,'PHASE180_AUDIT_WRITER_MIGRATION_READINESS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
console.log('Report written: PHASE180_AUDIT_WRITER_MIGRATION_READINESS.json');
