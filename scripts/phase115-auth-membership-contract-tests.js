#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(__dirname, 'phase115-live-auth-membership-probe.js'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'apps/api/src/organizations/organization-access.controller.ts'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.controller.ts'), 'utf8');
const checks = [
  ['uses implemented login route', script.includes("request('auth/login'") && auth.includes("@Post('login')")],
  ['checks bearer identity route', script.includes("request('auth/me'") && auth.includes("@Get('me')")],
  ['checks organization list route', script.includes("request('organization-access/mine'") && controller.includes("@Get('mine')")],
  ['checks organization context route', script.includes("request('organization-access/context'") && controller.includes("@Get('context')")],
  ['requires three distinct test accounts', script.includes('All three test accounts must have distinct email addresses.')],
  ['requires distinct tenant organization IDs', script.includes('orgA === orgB')],
  ['blocks non-local targets by default', script.includes('Non-local target blocked')],
  ['never prints credentials or tokens', !script.includes('console.log(token)') && !script.includes('console.log(password)') && !script.includes('console.log(accessToken)')],
  ['checks both cross-tenant denial directions', script.includes('Tenant A is denied Tenant B context') && script.includes('Tenant B is denied Tenant A context')],
  ['checks suspended membership denial', script.includes('Suspended-membership account is denied Tenant A context')],
  ['states scope limitation explicitly', script.includes('domain-route tenant enforcement requires separate route-specific tests')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nPhase 115 contract checks: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
