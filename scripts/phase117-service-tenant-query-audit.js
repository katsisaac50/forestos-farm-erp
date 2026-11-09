#!/usr/bin/env node
'use strict';
// Static triage only: signals for manual tenant-isolation review, not a vulnerability detector.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'apps', 'api', 'src');
const project = path.join(__dirname, '..');
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p = path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : (e.isFile() && e.name.endsWith('.service.ts') ? [p] : []);
  });
}
const patterns = {
  databaseRead: /\.(find|findOne|findById|countDocuments|aggregate|exists)\s*\(/g,
  databaseWrite: /\.(create|insertMany|updateOne|updateMany|findOneAndUpdate|findByIdAndUpdate|deleteOne|deleteMany|findOneAndDelete|findByIdAndDelete|replaceOne)\s*\(/g,
  orgField: /organizationId|organization_id|orgId|tenantId/gi,
  contextSignal: /resolveContext|OrganizationAccessService|organizationContext|context\.organizationId|currentOrganization/gi,
  authSignal: /req\.user|request\.user|userId|user\.sub|\bsub\b/gi,
};
const files = walk(root);
const services = files.map(file => {
  const src = fs.readFileSync(file,'utf8');
  const count = re => [...src.matchAll(re)].length;
  const reads = count(patterns.databaseRead), writes = count(patterns.databaseWrite);
  const org = count(patterns.orgField), ctx = count(patterns.contextSignal), auth = count(patterns.authSignal);
  const signals = [];
  if (reads + writes === 0) signals.push('NO_RECOGNIZED_MONGOOSE_QUERY_MARKERS');
  if ((reads + writes) > 0 && org === 0) signals.push('QUERY_MARKERS_WITHOUT_VISIBLE_ORGANIZATION_FIELD');
  if ((reads + writes) > 0 && ctx === 0) signals.push('QUERY_MARKERS_WITHOUT_VISIBLE_ORG_CONTEXT_SIGNAL');
  if (writes > 0 && org === 0) signals.push('WRITE_MARKERS_WITHOUT_VISIBLE_ORGANIZATION_FIELD');
  if (signals.length === 0) signals.push('STATIC_SCOPE_SIGNALS_PRESENT_REVIEW_QUERY_BY_QUERY');
  return {
    service: path.relative(project,file).replaceAll(path.sep,'/'),
    queryReadCallMarkers: reads,
    queryWriteCallMarkers: writes,
    organizationFieldMentions: org,
    organizationContextMentions: ctx,
    authOrUserMentions: auth,
    reviewSignals: signals,
    priority: (writes > 0 && org === 0) || ((reads + writes) > 0 && org === 0) ? 'P1_REVIEW' : ((reads + writes) > 0 && ctx === 0 ? 'P2_REVIEW' : 'P3_CONFIRM'),
  };
}).sort((a,b) => { const rank = {P1_REVIEW:0, P2_REVIEW:1, P3_CONFIRM:2}; return rank[a.priority] - rank[b.priority] || a.service.localeCompare(b.service); });
const report = {
  title:'ForestOS Phase 117 — Service-Level Tenant Query Review Queue',
  generatedAt:new Date().toISOString(),
  method:'Regex-based static triage of *.service.ts files only. Counts recognizable query method calls and mentions of organization/context/user signals; it does not parse TypeScript, resolve data flow, inspect every repository/helper/guard, or prove tenant isolation.',
  summary:{serviceFiles:services.length,p1Review:services.filter(s=>s.priority==='P1_REVIEW').length,p2Review:services.filter(s=>s.priority==='P2_REVIEW').length,p3Confirm:services.filter(s=>s.priority==='P3_CONFIRM').length,queryReadCallMarkers:services.reduce((n,s)=>n+s.queryReadCallMarkers,0),queryWriteCallMarkers:services.reduce((n,s)=>n+s.queryWriteCallMarkers,0)},
  services,
  requiredManualReview:['Trace each controller route into its service and repository/helper calls.','Verify every read, update, and delete is scoped to the authorized organization, including identifier-based lookups.','Verify organization IDs are derived from trusted membership context, not accepted blindly from request bodies or query strings.','Test cross-tenant read/write denial and suspended-membership denial against a dedicated non-production database.','Record evidence and reviewer sign-off; do not treat static flags as confirmed vulnerabilities or clean signals as proof of safety.']
};
const out = process.env.FORESTOS_PHASE117_AUDIT_OUT || path.join(project,'PHASE117_SERVICE_TENANT_QUERY_AUDIT.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log('ForestOS Phase 117 service-level tenant query review queue');
console.log(`Service files: ${report.summary.serviceFiles}`);
console.log(`P1 review: ${report.summary.p1Review}; P2 review: ${report.summary.p2Review}; P3 confirm: ${report.summary.p3Confirm}`);
console.log(`Query read markers: ${report.summary.queryReadCallMarkers}; write markers: ${report.summary.queryWriteCallMarkers}`);
console.log(`Report: ${path.relative(project,out)}`);
console.log('LIMIT: static triage only; not a security certification.');
