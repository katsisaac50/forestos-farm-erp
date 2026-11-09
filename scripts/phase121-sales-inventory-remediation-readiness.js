'use strict';
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const domains = [
  {name:'sales', files:['apps/api/src/sales/sales.controller.ts','apps/api/src/sales/sales.service.ts','apps/api/src/sales/sales.schema.ts'], controls:[
    ['controller authentication/organization context','Add JwtAuthGuard (or project-standard auth guard), resolve active organization membership from authenticated user + explicit organization selector, and pass verified context to every service method.'],
    ['list scope','Replace model.find() with a query constrained by verified organizationId; include pagination and stable sort.'],
    ['create ownership','Set organizationId and createdBy server-side from verified context; reject/ignore client-supplied ownership fields.'],
    ['update scope','Replace findByIdAndUpdate(id, ...) with findOneAndUpdate({_id:id, organizationId:context.organizationId}, sanitizedDto, ...); never allow tenant reassignment.'],
    ['schema and indexes','Add required organizationId field and tenant-aware uniqueness for orderId (compound unique index on organizationId + orderId); plan legacy data backfill before enforcing required.'],
    ['regression tests','Prove tenant A sees/updates only A records, tenant B cannot read/update A IDs, missing/inactive membership is denied, and client organizationId cannot reassign ownership.']
  ]},
  {name:'inventory', files:['apps/api/src/inventory/inventory.controller.ts','apps/api/src/inventory/inventory.service.ts','apps/api/src/inventory/inventory.schema.ts'], controls:[
    ['controller authentication/organization context','Add the project-standard auth guard, resolve active organization membership from authenticated user + explicit organization selector, and pass verified context to every service method.'],
    ['list scope','Replace model.find() with a query constrained by verified organizationId; include pagination and stable sort.'],
    ['create ownership','Set organizationId and createdBy server-side from verified context; reject/ignore client-supplied ownership fields.'],
    ['update scope','Replace findByIdAndUpdate(id, ...) with findOneAndUpdate({_id:id, organizationId:context.organizationId}, ...); prevent tenant reassignment and validate stock-field transitions.'],
    ['schema and indexes','Add required organizationId field and tenant-aware uniqueness for itemId (compound unique index on organizationId + itemId); plan legacy data backfill before enforcing required.'],
    ['regression tests','Prove tenant A sees/updates only A records, tenant B cannot read/update A IDs, missing/inactive membership is denied, and client organizationId cannot reassign ownership.']
  ]}
];
const findings=[];
for (const d of domains) {
  const source = d.files.map(f => ({file:f, text:fs.readFileSync(path.join(root,f),'utf8')}));
  const controller = source.find(x=>x.file.endsWith('.controller.ts')).text;
  const service = source.find(x=>x.file.endsWith('.service.ts')).text;
  const schema = source.find(x=>x.file.endsWith('.schema.ts')).text;
  findings.push({domain:d.name, status:'SOURCE_REVIEW_REQUIRED_NO_REMEDIATION_APPLIED', evidence:{controllerHasRecognizableAuthGuard:/UseGuards\s*\(/.test(controller),controllerHasOrganizationContext:/OrganizationAccessService|resolveContext|OrganizationContext/.test(controller),serviceHasUnscopedList:/\.find\s*\(\s*\)/.test(service),serviceHasUnscopedIdUpdate:/findByIdAndUpdate\s*\(/.test(service),schemaHasOrganizationId:/organizationId/.test(schema),schemaHasTenantAwareCompoundUnique:/organizationId[\s\S]{0,180}unique|unique[\s\S]{0,180}organizationId/.test(schema)}, controls:d.controls.map(([control,recommendation])=>({control,recommendation,status:'OPEN'}))});
}
const report={phase:121,title:'Sales and Inventory Tenant Remediation Readiness',generatedAt:new Date().toISOString(),status:'STATIC_REVIEW_ONLY_NOT_A_SECURITY_CERTIFICATION',method:'Direct inspection of the current Sales and Inventory controller, service, and schema source. These checks describe recognizable source patterns; they do not prove runtime exploitability or enforcement.',summary:{domainsReviewed:findings.length,domainsWithUnscopedList:findings.filter(x=>x.evidence.serviceHasUnscopedList).length,domainsWithUnscopedIdUpdate:findings.filter(x=>x.evidence.serviceHasUnscopedIdUpdate).length,domainsWithSchemaOrganizationId:findings.filter(x=>x.evidence.schemaHasOrganizationId).length,remediationControlsOpen:findings.reduce((n,x)=>n+x.controls.length,0)},domains:findings,implementationGuardrails:['Do not deploy a partial tenant migration to production.','Backfill and verify legacy records before requiring organizationId.','Use compound unique indexes where identifiers are tenant-local; resolve duplicates before index creation.','Do not trust organizationId supplied in DTOs, query strings, or arbitrary headers without verifying active membership.','Add cross-tenant integration tests before closing each control.','Review related child records, exports, reports, aggregates, and audit events for the same scope.']};
fs.writeFileSync(path.join(root,'PHASE121_SALES_INVENTORY_REMEDIATION_READINESS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
