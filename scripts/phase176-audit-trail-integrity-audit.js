#!/usr/bin/env node
'use strict';
// Read-only source audit for audit-trail integrity. Does not connect to databases or mutate source.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = {
  schema: path.join(root, 'apps/api/src/audit/audit.schema.ts'),
  service: path.join(root, 'apps/api/src/audit/audit.service.ts'),
  controller: path.join(root, 'apps/api/src/audit/audit.controller.ts'),
  financialSchema: path.join(root, 'apps/api/src/financial-audit-trail/financial-audit-trail.schema.ts'),
  financialService: path.join(root, 'apps/api/src/financial-audit-trail/financial-audit-trail.service.ts'),
};
const source = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '']));
const checks = [];
function add(id, area, status, evidence, recommendation) { checks.push({ id, area, status, evidence, recommendation }); }
function has(k, re) { return re.test(source[k]); }
add('AUD176-01','Generic audit event tenant identity',has('schema',/@Prop\([^)]*\)\s*tenantId|organizationId/)?'SIGNAL_PRESENT':'REVIEW_REQUIRED',has('schema',/tenantId|organizationId/)?'Tenant/organization field signal exists in generic audit schema.':'Generic AuditEvent schema has no visible tenantId/organizationId field.','Decide a backward-compatible tenant attribution plan; do not silently infer tenant from email.');
add('AUD176-02','Generic audit listing scope',has('service',/find\(\s*\{[^}]*tenantId|find\(\s*\{[^}]*organizationId/)?'SIGNAL_PRESENT':'REVIEW_REQUIRED',has('service',/find\(\s*\{[^}]*tenantId|find\(\s*\{[^}]*organizationId/)?'A tenant filter signal appears in a find query.':'AuditService.list currently appears to query without a tenant filter.','Review owner-role semantics and organization context; ensure list results are scoped where multi-tenant policy requires it.');
add('AUD176-03','Audit event creation required fields',has('schema',/@Prop\(\{required:true,index:true\}\) actorEmail/)&&has('schema',/@Prop\(\{required:true\}\) action/)&&has('schema',/@Prop\(\{required:true\}\) entityType/)&&has('schema',/@Prop\(\{required:true\}\) entityId/)?'SIGNAL_PRESENT':'REVIEW_REQUIRED','Checks required actor/action/entity field declarations in generic audit schema.','Validate actor identity, action vocabulary, entity identity and event time at write boundaries.');
add('AUD176-04','Audit event append-only protections',/immutable|append.only|pre\('findOneAndUpdate'|pre\('updateOne'/.test(source.schema+source.service)?'SIGNAL_PRESENT':'REVIEW_REQUIRED','Looks for visible immutable/append-only enforcement in generic audit schema/service.','Consider append-only database permissions, restricted update/delete paths, and tamper-evident export; timestamps alone are not immutability.');
add('AUD176-05','Audit listing authorization signal',has('controller',/@Roles\('owner'\)/)?'SIGNAL_PRESENT':'REVIEW_REQUIRED',has('controller',/@Roles\('owner'\)/)?'Owner role decorator is visible on audit listing route.':'No visible owner role decorator found on audit listing route.','Verify global guards and actual role enforcement in runtime tests.');
add('AUD176-06','Financial audit tenant identity',has('financialSchema',/tenantId|organizationId/)?'SIGNAL_PRESENT':'REVIEW_REQUIRED',has('financialSchema',/tenantId|organizationId/)?'Tenant/organization field signal exists in financial audit schema.':'FinancialAuditEntry schema has no visible tenantId/organizationId field.','Trace tenant ownership of all source models and ensure generated snapshot entries inherit validated tenant context.');
add('AUD176-07','Financial snapshot query scoping',has('financialService',/tenantId|organizationId/)?'SIGNAL_PRESENT':'REVIEW_REQUIRED',has('financialService',/tenantId|organizationId/)?'Tenant/organization query signal exists in financial audit service.':'Financial audit snapshot queries show no visible tenant filter in the inspected service.','Review every source query and generated audit-entry write for tenant scoping before multi-tenant production use.');
add('AUD176-08','Sensitive audit details minimization',/redact|redaction|allowlist|sanitize/i.test(source.service+source.financialService)?'SIGNAL_PRESENT':'REVIEW_REQUIRED','Checks for visible redaction/sanitization/allowlist signals in audit services.','Ensure metadata/details exclude credentials, tokens, secrets, and unnecessary personal or financial data.');
const review = checks.filter(x => x.status === 'REVIEW_REQUIRED').length;
const report = { phase:176, title:'Audit Trail Integrity & Tenant Attribution Readiness', generatedAt:new Date().toISOString(), mode:'read-only source inspection', decision: review ? 'NOT CLEARED FOR PRODUCTION' : 'REVIEW REQUIRED — static signals only', summary:{checks:checks.length,signalsPresent:checks.length-review,reviewRequired:review}, checks, limitations:['Text-based source inspection only; no API, database, build, or runtime security tests were executed.','SIGNAL_PRESENT does not prove runtime enforcement or complete tenant isolation.','Do not add tenant attribution by guesswork; existing audit.record call sites currently pass actor and event data without an explicit tenant argument.','Production clearance requires a reviewed migration strategy, role/tenant runtime tests, and database-level retention/tamper controls.'] };
const out = path.join(root,'PHASE176_AUDIT_TRAIL_INTEGRITY_REPORT.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
for(const c of checks) console.log(`${c.status} ${c.id} ${c.area} — ${c.evidence}`);
console.log(`Decision: ${report.decision}`);
console.log(`Report written: ${path.relative(root,out)}`);
