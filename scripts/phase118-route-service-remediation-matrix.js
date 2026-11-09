#!/usr/bin/env node
'use strict';
// Phase 118: build an explicit route -> controller -> likely service review matrix.
// Static heuristic only. Never treat inferred file proximity as a confirmed call graph.
const fs = require('node:fs');
const path = require('node:path');
const project = path.join(__dirname, '..');
const apiRoot = path.join(project, 'apps', 'api', 'src');
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p = path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : (e.isFile() && /\.(controller|service)\.ts$/.test(e.name) ? [p] : []);
  });
}
const routeReportPath = path.join(project, 'PHASE116_TENANT_ROUTE_AUDIT.json');
const serviceReportPath = path.join(project, 'PHASE117_SERVICE_TENANT_QUERY_AUDIT.json');
if (!fs.existsSync(routeReportPath) || !fs.existsSync(serviceReportPath)) {
  console.error('Missing Phase 116/117 reports. Run their audit scripts first.');
  process.exit(2);
}
const routeReport = JSON.parse(fs.readFileSync(routeReportPath,'utf8'));
const serviceReport = JSON.parse(fs.readFileSync(serviceReportPath,'utf8'));
const allFiles = walk(apiRoot);
const serviceByDir = new Map();
for (const f of allFiles.filter(f=>f.endsWith('.service.ts'))) {
  const d = path.dirname(f);
  if (!serviceByDir.has(d)) serviceByDir.set(d, []);
  serviceByDir.get(d).push(f);
}
const servicesByPath = new Map(serviceReport.services.map(s=>[s.service,s]));
const rows = [];
for (const c of routeReport.controllers) {
  const controllerAbs = path.join(project,c.controller);
  const dir = path.dirname(controllerAbs);
  const controllerSource = fs.readFileSync(controllerAbs,'utf8');
  const localServices = (serviceByDir.get(dir)||[]).map(f=>{
    const rel=path.relative(project,f).replaceAll(path.sep,'/');
    const stat=servicesByPath.get(rel);
    return {service:rel, referencedByController: new RegExp(path.basename(f,'.ts').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(controllerSource),
      priority:stat?.priority || 'NOT_IN_PHASE117_REPORT',
      reviewSignals:stat?.reviewSignals || []};
  });
  const explicitServiceMentions = [...controllerSource.matchAll(/(?:this\.)?([A-Za-z_$][\w$]*)\.(?:find|findOne|findById|create|update|delete|remove|save|list|get|create|update|delete)[A-Z_$\w]*/g)].map(m=>m[1]);
  const p1 = localServices.some(s=>s.priority==='P1_REVIEW');
  const priority = !c.tenantContextPresent ? (p1?'P1_ROUTE_AND_SERVICE_REVIEW':'P1_ROUTE_REVIEW') :
    (p1?'P2_SERVICE_REVIEW':'P3_VERIFY_EACH_ROUTE');
  rows.push({
    controller:c.controller,
    routes:c.routes,
    routeCount:c.routeCount,
    controllerContextSignal:c.tenantContextPresent,
    controllerClassification:c.classification,
    sameDirectoryServiceCandidates:localServices,
    heuristicServicePropertyMentions:[...new Set(explicitServiceMentions)],
    priority,
    requiredEvidence:[
      'Confirm actual controller-to-service call path; directory proximity is not proof.',
      'For every read, update, and delete, verify organization scope is part of the database predicate or is enforced by a verified shared layer.',
      'Verify organization ID comes from authenticated active membership, not untrusted request input.',
      'Add positive same-tenant and negative cross-tenant integration tests for each sensitive route.',
      'Record reviewer, test evidence, and disposition before closing.'
    ]
  });
}
const rank={P1_ROUTE_AND_SERVICE_REVIEW:0,P1_ROUTE_REVIEW:1,P2_SERVICE_REVIEW:2,P3_VERIFY_EACH_ROUTE:3};
rows.sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||a.controller.localeCompare(b.controller));
const report={
 title:'ForestOS Phase 118 — Route-to-Service Tenant Remediation Matrix',
 generatedAt:new Date().toISOString(),
 method:'Static heuristic join of Phase 116 controller route inventory and Phase 117 service query signals. Same-directory service candidates and property-name mentions are not a confirmed call graph.',
 summary:{
  controllers:rows.length,
  routes:rows.reduce((n,r)=>n+r.routeCount,0),
  p1RouteAndServiceReview:rows.filter(r=>r.priority==='P1_ROUTE_AND_SERVICE_REVIEW').length,
  p1RouteReview:rows.filter(r=>r.priority==='P1_ROUTE_REVIEW').length,
  p2ServiceReview:rows.filter(r=>r.priority==='P2_SERVICE_REVIEW').length,
  p3VerifyEachRoute:rows.filter(r=>r.priority==='P3_VERIFY_EACH_ROUTE').length,
  controllersWithoutContextSignal:rows.filter(r=>!r.controllerContextSignal).length
 },
 status:'REVIEW_MATRIX_ONLY_NOT_A_SECURITY_FINDING_OR_PRODUCTION_CERTIFICATION',
 controllers:rows,
 closureCriteria:[
  'Every route has an identified real call path, not merely a same-folder candidate.',
  'Every tenant-owned read/write/delete has verified organization scoping or a documented, tested enforcement layer.',
  'Cross-tenant access tests fail safely; same-tenant tests continue to pass.',
  'Suspended/inactive memberships are denied.',
  'Full dependency-installed API/web builds and database-backed tests pass in a dedicated non-production environment.',
  'A security reviewer signs off the evidence and unresolved risks.'
 ]
};
const out=process.env.FORESTOS_PHASE118_MATRIX_OUT||path.join(project,'PHASE118_ROUTE_SERVICE_REMEDIATION_MATRIX.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log('ForestOS Phase 118 route-to-service tenant remediation matrix');
console.log(`Controllers: ${report.summary.controllers}; routes: ${report.summary.routes}`);
console.log(`P1 route+service: ${report.summary.p1RouteAndServiceReview}; P1 route: ${report.summary.p1RouteReview}; P2 service: ${report.summary.p2ServiceReview}; P3 verify: ${report.summary.p3VerifyEachRoute}`);
console.log(`Report: ${path.relative(project,out)}`);
console.log('LIMIT: heuristic matrix only; not a confirmed call graph or security certification.');
