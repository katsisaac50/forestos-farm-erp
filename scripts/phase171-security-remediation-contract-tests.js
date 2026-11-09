#!/usr/bin/env node
'use strict';
const fs = require('node:fs'); const path = require('node:path');
const root = path.resolve(__dirname, '..');
const audit = fs.readFileSync(path.join(__dirname, 'phase171-security-remediation-readiness.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
 ['report clearly denies production clearance by default', audit.includes("overall: 'NOT CLEARED FOR PRODUCTION'")],
 ['labels itself as read-only source inspection', audit.includes("mode: 'read-only source inspection'")],
 ['does not connect to or mutate database', !/mongoose\.connect|\.save\(|\.deleteMany\(|\.updateMany\(/.test(audit)],
 ['checks tenant identity signal and missing-claim rejection', audit.includes('req.user?.organizationId || req.user?.tenantId') && audit.includes('UnauthorizedException')],
 ['flags absent explicit role policy for review', audit.includes('REVIEW REQUIRED') && audit.includes('@Roles')],
 ['checks guard wiring without treating it as proof', audit.includes('GUARD SIGNAL VISIBLE — VERIFY WIRING')],
 ['tracks DTO validation configuration review', audit.includes('ValidationPipe') && audit.includes('whitelist, forbidNonWhitelisted')],
 ['requires runtime tenant-scoped persistence evidence', audit.includes('RUNTIME EVIDENCE REQUIRED') && audit.includes('cross-tenant read/write tests')],
 ['states runtime and human-review limitations', audit.includes('Does not execute HTTP requests') && audit.includes('Human review and live tests')],
 ['writes machine-readable report', audit.includes('PHASE171_SECURITY_REMEDIATION_READINESS.json') && audit.includes('JSON.stringify(report, null, 2)')],
 ['exposes phase 171 npm scripts', !!pkg.scripts['test:phase171:contract'] && !!pkg.scripts['audit:phase171:security-readiness']],
 ['preserves existing phase 170 commands', !!pkg.scripts['test:phase170:contract'] && !!pkg.scripts['probe:phase170:authorization']],
];
let failed=0; for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`Phase 171 security remediation contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed) process.exitCode=1;
