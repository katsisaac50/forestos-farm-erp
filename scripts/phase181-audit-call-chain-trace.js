#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'apps/api/src');
const files = [];
function walk(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, ent.name); if (ent.isDirectory()) walk(full); else if (ent.isFile() && ent.name.endsWith('.ts') && !ent.name.endsWith('.spec.ts')) files.push(full); } }
walk(srcRoot);
const controllers = files.filter(f => f.endsWith('.controller.ts'));
const rows = [];
for (const file of files.filter(f => f.endsWith('.service.ts'))) {
  const source = fs.readFileSync(file, 'utf8');
  const re = /\.audit\.record\s*\(/g; let match;
  while ((match = re.exec(source))) {
    const line = source.slice(0, match.index).split('\n').length;
    const rel = path.relative(root, file).split(path.sep).join('/');
    const moduleDir = path.dirname(file);
    const controllerPath = path.join(moduleDir, path.basename(file).replace('.service.ts', '.controller.ts'));
    const exists = fs.existsSync(controllerPath);
    const controller = exists ? fs.readFileSync(controllerPath, 'utf8') : '';
    const controllerRel = exists ? path.relative(root, controllerPath).split(path.sep).join('/') : null;
    const hasRolesDecorator = /@Roles\s*\(/.test(controller);
    const hasAuthGuard = /UseGuards|AuthGuard|JwtAuthGuard/.test(controller);
    const hasTenantContext = /OrganizationContext|requireOrganizationContext|organizationId|tenantId/.test(controller);
    const serviceHasTenantContext = /OrganizationContext|requireOrganizationContext|organizationId|tenantId/.test(source);
    rows.push({ service: rel, line, controller: controllerRel, controllerFound: exists, roleDecoratorSignal: hasRolesDecorator, explicitGuardSignal: hasAuthGuard, controllerTenantSignal: hasTenantContext, serviceTenantSignal: serviceHasTenantContext, status: hasTenantContext && serviceHasTenantContext ? 'REVIEW_CALL_CHAIN_BEFORE_CONVERSION' : 'TRUSTED_TENANT_CONTEXT_NOT_ESTABLISHED', requiredAction: 'Trace authenticated principal to validated organization membership and tenant-scoped resource query; then pass explicit tenantId to recordForTenant().' });
  }
}
const grouped = {};
for (const row of rows) (grouped[row.service] ??= []).push(row);
const report = {
  phase: 181,
  title: 'Audit Writer Call-Chain Trace & Tenant Scope Readiness',
  status: 'TRACE_COMPLETE_MIGRATION_BLOCKED_PENDING_TRUSTED_CONTEXT',
  method: 'Static source inspection only. Decorator names and context keywords are signals, not proof of effective runtime authentication or authorization.',
  summary: {
    legacyCallSites: rows.length,
    serviceFiles: Object.keys(grouped).length,
    controllerFilesFound: rows.filter(r => r.controllerFound).length,
    roleDecoratorSignals: rows.filter(r => r.roleDecoratorSignal).length,
    explicitGuardSignals: rows.filter(r => r.explicitGuardSignal).length,
    callSitesWithControllerAndServiceTenantSignals: rows.filter(r => r.controllerTenantSignal && r.serviceTenantSignal).length,
    convertedCallSites: 0
  },
  findings: rows,
  safetyRules: [
    'Do not convert a writer until the tenant ID comes from validated authenticated membership.',
    'Role decorators are not proof of guard activation; inspect global and controller guard configuration.',
    'A tenant filter must protect both reads and writes, not only the audit record.',
    'Do not infer tenant from actor email, DTOs, metadata, or unscoped resource IDs.',
    'Keep legacy writer compatibility until each caller has a reviewed trusted context.'
  ],
  limitations: [
    'Static analysis can miss inherited, global, aliased, or indirect guards and writer calls.',
    'Does not prove runtime authentication, membership validation, or database query isolation.',
    'No source calls were automatically converted.',
    'No production build, live database test, or live HTTP authorization test was run.'
  ],
  productionClearance: 'NOT CLEARED FOR PRODUCTION'
};
fs.writeFileSync(path.join(root, 'PHASE181_AUDIT_CALL_CHAIN_TRACE.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
console.log('Report written: PHASE181_AUDIT_CALL_CHAIN_TRACE.json');
