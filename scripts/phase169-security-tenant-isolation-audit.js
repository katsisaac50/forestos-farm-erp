#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const srcRoot = path.join(root, 'apps', 'api', 'src');
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.isFile() && e.name.endsWith('.controller.ts') ? [p] : []);
  });
}
const controllers = walk(srcRoot).map(file => {
  const source = fs.readFileSync(file, 'utf8');
  const methods = [...source.matchAll(/@(Get|Post|Put|Patch|Delete)\s*\(/g)].map(m=>m[1].toUpperCase());
  const hasGuard = /@UseGuards\s*\(/.test(source) || /@Roles\s*\(/.test(source);
  const hasTenantContext = /OrganizationAccessService|resolveContext\s*\(|organizationId|tenantId/.test(source);
  const hasRolePolicy = /@Roles\s*\(/.test(source);
  const routeCount = methods.length;
  return {file:path.relative(root,file).replaceAll(path.sep,'/'), routeCount, hasGuardOrRoleDecorator:hasGuard, hasTenantContextReference:hasTenantContext, hasRolePolicyReference:hasRolePolicy,
    status: !routeCount ? 'NO_DECORATED_ROUTES_DETECTED' : (!hasGuard ? 'REVIEW_REQUIRED_GUARD_NOT_VISIBLE' : (!hasTenantContext ? 'REVIEW_REQUIRED_TENANT_CONTEXT_NOT_VISIBLE' : (!hasRolePolicy ? 'REVIEW_REQUIRED_ROLE_POLICY_NOT_VISIBLE' : 'STATIC_SIGNALS_PRESENT_REVIEW_REQUIRED')))};
});
controllers.sort((a,b)=>a.file.localeCompare(b.file));
const registryFile = path.join(srcRoot,'registry-persistence','registry-persistence.controller.ts');
const registrySource = fs.existsSync(registryFile) ? fs.readFileSync(registryFile,'utf8') : '';
const registry = {
  controllerFound: !!registrySource,
  derivesTenantFromRequestUser: /req\.user\?\.(organizationId|tenantId)/.test(registrySource),
  checksMissingTenantClaim: /UnauthorizedException/.test(registrySource),
  explicitRoleDecoratorPresent: /@Roles\s*\(/.test(registrySource),
  note: 'Static inspection only. Authentication may be global; this audit does not execute guards or prove runtime authorization or query isolation.'
};
const report = {
  title:'ForestOS Phase 169 — Security and Tenant-Isolation Static Audit',
  generatedAt:new Date().toISOString(),
  decision:'REVIEW REQUIRED — static inventory is not security certification',
  methodology:'Scans controller source for decorated HTTP routes, visible guard/role decorators, and tenant-context signals. Heuristics can produce false positives and false negatives.',
  summary:{controllersScanned:controllers.length,routesInventoried:controllers.reduce((n,c)=>n+c.routeCount,0),controllersWithoutVisibleGuardOrRole:controllers.filter(c=>c.routeCount&&!c.hasGuardOrRoleDecorator).length,controllersWithoutVisibleTenantContext:controllers.filter(c=>c.routeCount&&!c.hasTenantContextReference).length,controllersWithoutVisibleRolePolicy:controllers.filter(c=>c.routeCount&&!c.hasRolePolicyReference).length},
  registryPersistence:registry,
  controllers,
  requiredManualChecks:['Verify global and route-level authentication at runtime.','Test that a user from tenant A cannot read or mutate tenant B records.','Verify role enforcement for every write and sensitive read route.','Review tenant identity claims, token validation, and authorization failures.','Review secrets, CORS, rate limits, audit logging, and production environment settings.']
};
const out = path.join(root,'PHASE169_SECURITY_TENANT_ISOLATION_AUDIT.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log('ForestOS Phase 169 — Security & Tenant-Isolation Static Audit');
console.log(`Controllers scanned: ${report.summary.controllersScanned}`);
console.log(`Routes inventoried: ${report.summary.routesInventoried}`);
console.log(`Controllers with no visible guard/role signal: ${report.summary.controllersWithoutVisibleGuardOrRole}`);
console.log(`Registry controller tenant claim check: ${registry.derivesTenantFromRequestUser && registry.checksMissingTenantClaim ? 'PRESENT' : 'REVIEW REQUIRED'}`);
console.log(`Registry explicit role decorator: ${registry.explicitRoleDecoratorPresent ? 'PRESENT' : 'NOT VISIBLE — REVIEW REQUIRED'}`);
console.log(`Report: ${path.relative(root,out)}`);
console.log('LIMIT: static inventory only; no runtime authorization was tested.');
