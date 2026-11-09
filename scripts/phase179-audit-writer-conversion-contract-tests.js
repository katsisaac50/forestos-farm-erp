#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const plantation = fs.readFileSync(path.join(root, 'apps/api/src/plantations/plantations.service.ts'), 'utf8');
const auditService = fs.readFileSync(path.join(root, 'apps/api/src/audit/audit.service.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const checks = [
  ['plantation creation uses tenant-aware audit writer', /recordForTenant\([\s\S]{0,180}'created', 'plantation'/.test(plantation)],
  ['plantation update uses tenant-aware audit writer', /recordForTenant\([\s\S]{0,180}'updated', 'plantation'/.test(plantation)],
  ['tenant context derives from validated organization context', /const context = requireOrganizationContext\(rawContext\)/.test(plantation) && /tenantId:\s*context\.organizationId/.test(plantation)],
  ['actor email is passed with tenant context', /\{ tenantId: context\.organizationId, actorEmail \}/.test(plantation)],
  ['plantation creation preserves organization metadata', /Created plantation block[\s\S]{0,100}organizationId: context\.organizationId/.test(plantation)],
  ['plantation update preserves changed-field metadata', /Updated plantation block[\s\S]{0,180}fields: Object\.keys\(safeDto\)/.test(plantation)],
  ['tenant-aware writer rejects missing trusted context', /Trusted tenant and actor context are required/.test(auditService)],
  ['legacy writer remains explicitly documented as unattributed', /Events written here have no tenantId/.test(auditService)],
  ['contract command registered', !!pkg.scripts['test:phase179:contract']],
  ['README documents limited conversion scope', /Phase 179 — Audit Writer Conversion/.test(readme)],
  ['test does not connect to a database', !/mongoose\.connect|MongoClient/.test(plantation + auditService)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 179 contract tests: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
