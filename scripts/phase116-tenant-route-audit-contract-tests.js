#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(__dirname, 'phase116-tenant-route-audit.js'), 'utf8');
const plantation = fs.readFileSync(path.join(root, 'apps/api/src/plantations/plantations.controller.ts'), 'utf8');
const orgAccess = fs.readFileSync(path.join(root, 'apps/api/src/organizations/organization-access.service.ts'), 'utf8');
const checks = [
 ['walks API controller source tree', script.includes("e.name.endsWith('.controller.ts')")],
 ['inventories common HTTP decorator verbs', ['Get','Post','Put','Patch','Delete'].every(v => script.includes(v))],
 ['identifies organization-context enforcement references', script.includes('resolveContext') && script.includes('OrganizationAccessService')],
 ['writes machine-readable JSON report', script.includes('JSON.stringify(output, null, 2)')],
 ['explicitly states static-only limitation', script.includes('does not prove service query scoping')],
 ['explicitly avoids security certification claims', script.includes('not a security certification')],
 ['plantations controller resolves organization context', plantation.includes('this.organizationAccess.resolveContext')],
 ['organization access checks active membership', orgAccess.includes("status: 'active'") && orgAccess.includes('this.memberships.findOne')],
 ['flags controllers with no context reference for review', script.includes('NO_ORGANIZATION_CONTEXT_ENFORCEMENT_FOUND')],
 ['does not mutate database or call API endpoints', !script.includes('mongoose') && !script.includes('MongoClient') && !script.includes('fetch(')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nPhase 116 contract checks: ${checks.length-failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
