#!/usr/bin/env node
'use strict';
// Read-only source inventory. Signals are heuristic and never constitute runtime proof.
const fs = require('node:fs'); const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api', 'src');
const reportPath = path.join(root, 'PHASE172_TENANT_DATA_ACCESS_REPORT.json');
function walk(dir) { let out=[]; if(!fs.existsSync(dir)) return out; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) out=out.concat(walk(p)); else if(/\.(service|controller)\.ts$/.test(e.name)) out.push(p); } return out; }
const files=walk(api); const findings=[]; const inventory=[];
const queryRe=/(find(?:One|ById|ByIdAndUpdate|OneAndUpdate|OneAndDelete|ByIdAndDelete|OneAndRemove|OneAndReplace|OneAndUpdate)?|updateOne|updateMany|deleteOne|deleteMany|countDocuments|aggregate|replaceOne)\s*\(/g;
for(const file of files){ const src=fs.readFileSync(file,'utf8'); const rel=path.relative(root,file).replace(/\\/g,'/'); const queries=[...src.matchAll(queryRe)].map(m=>({method:m[1],index:m.index}));
  if(!queries.length) continue;
  const contexts=queries.map(q=>{const start=Math.max(0,q.index-180), end=Math.min(src.length,q.index+300); const snippet=src.slice(start,end).replace(/\s+/g,' '); const tenantSignal=/tenantId|organizationId|organization|tenant|req\.user|currentTenant/i.test(snippet); return {method:q.method, tenantSignal};});
  const noSignal=contexts.filter(c=>!c.tenantSignal).length;
  inventory.push({file:rel,queryCount:queries.length,tenantSignalContexts:contexts.filter(c=>c.tenantSignal).length,contextsWithoutVisibleTenantSignal:noSignal});
  if(noSignal) findings.push({id:'DATA-SCOPE-'+String(findings.length+1).padStart(3,'0'),severity:'HIGH',status:'REVIEW REQUIRED',file:rel,queryCount:queries.length,contextsWithoutVisibleTenantSignal:noSignal,description:'One or more database-operation contexts lack a nearby visible tenant/organization signal. This heuristic can produce false positives and does not prove a vulnerability.',requiredEvidence:'Inspect full method and helper call chain; verify tenant predicate is enforced server-side on every read/write; add cross-tenant runtime tests.'});
}
const report={phase:172,title:'Tenant-Scoped Data Access Verification',mode:'read-only heuristic source inventory',generatedAt:new Date().toISOString(),overall:'NOT CLEARED FOR PRODUCTION',summary:{sourceFilesScanned:files.length,filesWithDatabaseOperationSignals:inventory.length,operationContextsFlaggedForReview:findings.reduce((n,f)=>n+f.contextsWithoutVisibleTenantSignal,0),findingsRequiringReview:findings.length},inventory,findings,limitations:['Text heuristics do not understand dataflow, helper functions, decorators, middleware, or database query semantics.','A visible tenant string is not proof of correct tenant scoping.','No API requests or database operations are executed.','Production clearance requires code review and live cross-tenant read/write tests in a disposable environment.']};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`Phase 172 tenant data access audit: scanned ${files.length} service/controller files; ${inventory.length} files contain database-operation signals; ${findings.length} require review.`);
console.log(`Report: ${path.relative(root,reportPath)}`); console.log('Overall: NOT CLEARED FOR PRODUCTION (read-only heuristic; runtime proof required).');
