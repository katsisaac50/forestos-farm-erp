
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const moduleSource = read('apps/api/src/auth/auth.module.ts');
const guard = read('apps/api/src/auth/roles.guard.ts');
const controller = read('apps/api/src/auth/auth.controller.ts');

const checks = [
  {
    name: 'AuthModule resolves and configures JWT secret at startup',
    passed: /secret:\s*resolveJwtSecret\(process\.env\)/.test(moduleSource),
  },
  {
    name: 'Guard verifies with configured JwtService',
    passed: /this\.jwt\.verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)/.test(guard),
  },
  {
    name: 'Guard does not override verifier secret from process.env',
    passed: !/verifyAsync[\s\S]{0,100}process\.env\.JWT_SECRET/.test(guard),
  },
  {
    name: 'Token issuer uses configured JwtService',
    passed: /this\.jwt\.sign\(payload\)/.test(controller),
  },
  {
    name: 'JWT module and guard use same JwtService provider',
    passed: /private(?:\s+readonly)?\s+jwt:\s*JwtService/.test(guard)
      && /private(?:\s+readonly)?\s+jwt:\s*JwtService/.test(controller),
  },
  {
    name: 'No hard-coded fallback secret was added',
    passed: !/JWT_SECRET\s*\|\|\s*['"`]/.test(moduleSource + guard + controller),
  },
  {
    name: 'Guard requires strict Bearer token format',
    passed: /\/\^Bearer\\s\+\(\\S\+\)\$\/i\.exec\(authorization\.trim\(\)\)/.test(guard),
  },
  {
    name: 'Guard rejects unavailable or inactive database accounts',
    passed: /findById\(subject\)[\s\S]*?select\(['"]_id email role active['"]\)/.test(guard)
      && /!account\s*\|\|\s*account\.active\s*!==\s*true/.test(guard),
  },
  {
    name: 'Guard enforces declared roles using current database role',
    passed: /roles\?\.length\s*&&\s*!roles\.includes\(account\.role\)/.test(guard),
  },
];

const report = {
  phase: 186,
  title: 'JWT Verification Configuration Consistency Audit',
  generatedAt: new Date().toISOString(),
  mode: 'static-contract-only',
  checks,
  passed: checks.filter(c => c.passed).length,
  failed: checks.filter(c => !c.passed).length,
  liveRuntimeTestsRun: false,
  productionCleared: false,
  limitations: [
    'No live NestJS application authentication request was executed.',
    'No HTTP authentication requests were sent.',
    'No MongoDB connection or cross-tenant test was run.',
    'Static source checks do not prove runtime dependency injection or authentication behavior.',
  ],
};

fs.writeFileSync(
  path.join(root, 'PHASE186_JWT_VERIFICATION_CONSISTENCY.json'),
  JSON.stringify(report, null, 2) + '\n',
);

for (const c of checks) {
  console.log(`${c.passed ? 'PASS' : 'FAIL'} ${c.name}`);
}

console.log(`Phase 186 JWT consistency audit: ${report.passed}/${checks.length} passed`);

if (report.failed) process.exitCode = 1;
