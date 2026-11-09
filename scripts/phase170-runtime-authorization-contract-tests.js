#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const probe = fs.readFileSync(path.join(__dirname, 'phase170-runtime-authorization-probe.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['requires explicit opt-in test tenant credentials', probe.includes('FORESTOS_TEST_TENANT_A_TOKEN') && probe.includes('FORESTOS_TEST_TENANT_B_TOKEN')],
 ['requires distinct tenant IDs and tokens', probe.includes('Distinct test identities') && probe.includes('TENANT_A_ID') && probe.includes('TENANT_B_ID')],
 ['uses read-only GET requests only', /method: 'GET'/.test(probe) && !/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/.test(probe)],
 ['rejects cross-origin endpoint paths', probe.includes('target.origin !== base.origin')],
 ['blocks tokens in query parameters', probe.includes('searchParams.has(\'token\')') && probe.includes('searchParams.has(\'access_token\')')],
 ['tests tenant A authenticated read', probe.includes('Tenant A authenticated read')],
 ['tests tenant B authenticated read', probe.includes('Tenant B authenticated read')],
 ['checks tenant IDs in response payloads', probe.includes('tenantIds(a.body)') && probe.includes('tenantIds(b.body)')],
 ['tests missing bearer token rejection', probe.includes('Missing token rejected')],
 ['tests invalid bearer token rejection', probe.includes('Invalid token rejected')],
 ['does not log response bodies or tokens', probe.includes('response body is never printed') && !probe.includes('console.log(JSON.stringify(body)')],
 ['writes machine-readable report and declares limitations', probe.includes('PHASE170_RUNTIME_AUTHORIZATION_REPORT.json') && probe.includes('does not prove write-path isolation')],
 ['exposes npm scripts for contract and runtime probe', pkg.scripts['test:phase170:contract'] && pkg.scripts['probe:phase170:authorization']]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 170 runtime authorization contract tests: ${checks.length-failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
