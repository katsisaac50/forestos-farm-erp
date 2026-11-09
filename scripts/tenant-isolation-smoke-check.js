#!/usr/bin/env node
/**
 * ForestOS Phase 101: static security regression checks.
 * This is a source-pattern smoke check, not a substitute for runtime/API integration tests.
 */
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const checks = [
  {
    file: 'apps/api/src/organizations/organization-scope.ts',
    label: 'organizationFilter forces trusted organizationId after stripping untrusted input',
    test: s => /const\s+\{\s*organizationId:\s*_untrustedOrganizationId,\s*\.\.\.safeFilters\s*\}\s*=\s*filters/.test(s)
      && /return\s+\{\s*\.\.\.safeFilters,\s*organizationId:\s*context\.organizationId\s*\}/.test(s),
  },
  {
    file: 'apps/api/src/organizations/organization-access.service.ts',
    label: 'organization context requires active organization and active membership',
    test: s => /status:\s*'active'/.test(s) && /No active membership/.test(s) && /organizationId:\s*String\(organization\._id\)/.test(s),
  },
  {
    file: 'apps/api/src/field-capture/field-capture.controller.ts',
    label: 'field capture controller requires JWT and organization header resolution',
    test: s => /@UseGuards\(JwtAuthGuard\)/.test(s) && /x-organization-id/.test(s) && /resolveContext/.test(s),
  },
  {
    file: 'apps/api/src/field-capture/evidence-storage.service.ts',
    label: 'evidence queries use organization-scoped capture lookup and digest verification',
    test: s => /organizationFilter\(c,\s*\{\s*_id:/.test(s) && /createHash\('sha256'\)/.test(s) && /Evidence integrity check failed/.test(s),
  },
  {
    file: 'apps/api/src/field-capture/evidence-storage.service.ts',
    label: 'evidence upload uses conditional atomic manifest append and bounded item count',
    test: s => /findOneAndUpdate/.test(s) && /\$push:\s*\{\s*evidenceManifest:\s*item\s*\}/.test(s) && /\$size/.test(s),
  },
  {
    file: 'apps/api/src/field-capture/evidence-storage.service.ts',
    label: 'evidence quota configuration is validated',
    test: s => /FORESTOS_EVIDENCE_ORG_QUOTA_BYTES/.test(s) && /ORG_QUOTA_BYTES\s*<=\s*0/.test(s),
  },
  {
    file: 'apps/api/src/health.controller.ts',
    label: 'health endpoints disclose process-only readiness limitation',
    test: s => /@Get\('ready'\)/.test(s) && /database:\s*'not_checked'/.test(s),
  },
];
let failed = false;
for (const check of checks) {
  const filePath = path.join(base, check.file);
  let source = '';
  try { source = fs.readFileSync(filePath, 'utf8'); }
  catch { console.error(`FAIL  ${check.label} — missing file ${check.file}`); failed = true; continue; }
  const pass = check.test(source);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${check.label}`);
  if (!pass) failed = true;
}
console.log('');
console.log('Scope: static source-pattern checks only. These checks do not prove runtime tenant isolation.');
console.log(failed ? 'Result: FAIL' : 'Result: PASS');
process.exitCode = failed ? 1 : 0;
