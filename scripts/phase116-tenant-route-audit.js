#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'apps', 'api', 'src');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.isFile() && e.name.endsWith('.controller.ts') ? [p] : []);
  });
}
const files = walk(root);
const results = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const routes = [...src.matchAll(/@(Get|Post|Put|Patch|Delete)\s*\(\s*(['"`])([^'"`]*)\2\s*\)/g)];
  if (!routes.length) continue;
  const tenantAware = /OrganizationAccessService|resolveContext\s*\(|organizationAccess\.resolveContext/.test(src);
  const routeNames = routes.map(m => `${m[1].toUpperCase()} /${m[3]}`);
  results.push({
    controller: path.relative(path.join(__dirname, '..'), file).replaceAll(path.sep, '/'),
    tenantContextPresent: tenantAware,
    routeCount: routeNames.length,
    routes: routeNames,
    classification: tenantAware ? 'CONTEXT_ENFORCEMENT_PRESENT_REVIEW_EACH_ROUTE' : 'NO_ORGANIZATION_CONTEXT_ENFORCEMENT_FOUND',
  });
}
results.sort((a,b) => a.controller.localeCompare(b.controller));
const output = {
  title: 'ForestOS Phase 116 — Domain Route Tenant Enforcement Inventory',
  generatedAt: new Date().toISOString(),
  method: 'Static source inspection only; detects controller-level references to OrganizationAccessService/resolveContext and does not prove service query scoping.',
  summary: {
    controllersWithRoutes: results.length,
    contextPresent: results.filter(x => x.tenantContextPresent).length,
    noContextReference: results.filter(x => !x.tenantContextPresent).length,
    totalRoutes: results.reduce((n,x) => n+x.routeCount, 0),
  },
  controllers: results,
};
const outPath = process.env.FORESTOS_PHASE116_AUDIT_OUT || path.join(__dirname, '..', 'PHASE116_TENANT_ROUTE_AUDIT.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log('ForestOS Phase 116 tenant route inventory');
console.log(`Controllers with routes: ${output.summary.controllersWithRoutes}`);
console.log(`Controllers referencing organization context: ${output.summary.contextPresent}`);
console.log(`Controllers with no organization-context reference: ${output.summary.noContextReference}`);
console.log(`Total decorated routes inventoried: ${output.summary.totalRoutes}`);
console.log(`Report: ${path.relative(path.join(__dirname, '..'), outPath)}`);
console.log('LIMIT: inventory is a review aid, not a security certification.');
