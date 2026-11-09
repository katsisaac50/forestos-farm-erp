#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'apps/api/src');
const files = [];
function walk(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, ent.name); if (ent.isDirectory()) walk(full); else if (ent.isFile() && ent.name.endsWith('.ts') && !ent.name.endsWith('.spec.ts')) files.push(full); } }
walk(srcRoot);
const entries = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const legacyCalls = (content.match(/\.audit\.record\s*\(/g) || []).length;
  const tenantAwareCalls = (content.match(/\.audit\.recordForTenant\s*\(/g) || []).length;
  if (legacyCalls || tenantAwareCalls) entries.push({ file: path.relative(root, file).split(path.sep).join('/'), legacyWriterCalls: legacyCalls, tenantAwareWriterCalls: tenantAwareCalls, status: legacyCalls ? 'REVIEW_OR_CONVERT' : 'TENANT_AWARE_SIGNAL' });
}
const totals = entries.reduce((a, x) => ({ legacyWriterCalls: a.legacyWriterCalls + x.legacyWriterCalls, tenantAwareWriterCalls: a.tenantAwareWriterCalls + x.tenantAwareWriterCalls }), { legacyWriterCalls: 0, tenantAwareWriterCalls: 0 });
const report = { phase: 179, generatedAt: new Date().toISOString(), status: 'NOT_CLEARED_FOR_PRODUCTION', method: 'Static text inventory; counts are signals and require manual call-chain review.', totals: { filesWithWriterCalls: entries.length, ...totals }, convertedCallSites: ['apps/api/src/plantations/plantations.service.ts: plantation create and update use recordForTenant with validated OrganizationContext'], entries, limitations: ['This inventory recognizes direct .audit.record and .audit.recordForTenant patterns only.', 'It does not prove runtime authorization or tenant isolation.', 'Legacy audit writers remain and may create unattributed events.', 'Do not infer tenant ownership from actor email or arbitrary metadata.'] };
fs.writeFileSync(path.join(root, 'PHASE179_AUDIT_WRITER_COVERAGE_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.totals, null, 2));
console.log(`Report written: PHASE179_AUDIT_WRITER_COVERAGE_REPORT.json`);
