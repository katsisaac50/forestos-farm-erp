'use strict';
// Static heuristic only: this is a prioritization aid, not a security proof.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const domains = ['sales','inventory','procurement','finance','workforce','evidence','audit'];
function read(rel) { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; } }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function analyze(domain) {
  const base = `apps/api/src/${domain}`;
  const controllerPath = `${base}/${domain}.controller.ts`;
  const servicePath = `${base}/${domain}.service.ts`;
  const controller = read(controllerPath), service = read(servicePath);
  if (!controller && !service) return { domain, status: 'NOT_FOUND', priority: 'P4_CONFIRM_MODULE_NAME', routes: 0, signals: [], requiredEvidence: ['Confirm module path/name and whether it contains tenant-owned records.'] };
  const routeMatches = controller.match(/@(Get|Post|Patch|Put|Delete)\s*(?:\(([^)]*)\))?/g) || [];
  const writes = routeMatches.filter(x => /@(Post|Patch|Put|Delete)/.test(x)).length;
  const controllerContext = /OrganizationAccessService|resolveContext\s*\(|organizationId|organizationFilter|TenantContext|tenantContext/i.test(controller);
  const serviceContext = /organizationFilter|organizationId|tenantContext|resolveContext|organizationDocument/i.test(service);
  const rawQueries = (service.match(/\.(find|findOne|findById|findByIdAndUpdate|findOneAndUpdate|findByIdAndDelete|updateMany|deleteMany|aggregate|create|insertMany)\s*\(/g) || []).length;
  const queryWithoutScope = /\.find\s*\(\s*\)|\.findOne\s*\(\s*\)|\.findById\s*\(|\.findByIdAndUpdate\s*\(|\.findOneAndUpdate\s*\(/.test(service);
  const signals = [];
  if (!controllerContext) signals.push('NO_VISIBLE_TENANT_CONTEXT_SIGNAL_IN_CONTROLLER');
  if (!serviceContext) signals.push('NO_VISIBLE_TENANT_CONTEXT_SIGNAL_IN_SERVICE');
  if (queryWithoutScope) signals.push('UNSCOPED_LOOKING_QUERY_PATTERN');
  if (writes && !serviceContext) signals.push('WRITE_ROUTES_WITHOUT_VISIBLE_TENANT_CONTEXT');
  const priority = signals.includes('UNSCOPED_LOOKING_QUERY_PATTERN') && writes ? 'P1_REVIEW' : signals.length ? 'P2_REVIEW' : 'P3_VERIFY_EACH_ROUTE';
  return { domain, status: 'STATIC_SOURCE_REVIEW', controller: exists(controllerPath) ? controllerPath : null, service: exists(servicePath) ? servicePath : null, routes: routeMatches.length, writeRoutes: writes, visibleControllerTenantContextSignal: controllerContext, visibleServiceTenantContextSignal: serviceContext, serviceQueryCallMarkers: rawQueries, signals, priority, requiredEvidence: ['Trace the actual controller-to-service path; static pattern matching is not a call graph.', 'Verify organization scope in every read/write predicate or in a proven shared enforcement layer.', 'Test same-tenant allow and cross-tenant deny for list, detail, create, update, delete and dashboard/aggregate routes where applicable.', 'Record reviewer, runtime test evidence, and disposition before closing.'] };
}
const rows = domains.map(analyze);
const report = { title: 'ForestOS Phase 120 — Critical Domain Tenant Coverage Queue', generatedAt: new Date().toISOString(), method: 'Static source-pattern triage of selected domain controllers and services. Signals can be false positives or false negatives; absence of a signal is not proof of enforcement.', status: 'TRIAGE_ONLY_NOT_A_SECURITY_FINDING_OR_PRODUCTION_CERTIFICATION', summary: { domainsReviewed: rows.filter(x => x.status === 'STATIC_SOURCE_REVIEW').length, domainsNotFound: rows.filter(x => x.status === 'NOT_FOUND').length, p1Review: rows.filter(x => x.priority === 'P1_REVIEW').length, p2Review: rows.filter(x => x.priority === 'P2_REVIEW').length, p3Verify: rows.filter(x => x.priority === 'P3_VERIFY_EACH_ROUTE').length }, domains: rows };
const out = path.join(root, 'PHASE120_CRITICAL_DOMAIN_TENANT_COVERAGE.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(root, out), summary: report.summary, queue: rows.map(({domain,priority,signals})=>({domain,priority,signals})) }, null, 2));
