'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const script = fs.readFileSync(
  path.join(__dirname, 'phase185-auth-runtime-readiness.js'),
  'utf8',
);

const guard = fs.readFileSync(
  path.join(root, 'apps/api/src/auth/roles.guard.ts'),
  'utf8',
);

const policy = fs.readFileSync(
  path.join(root, 'apps/api/src/auth/jwt-secret-policy.js'),
  'utf8',
);

const tests = [
  ['readiness probe is present', script.includes('Authentication Runtime Readiness')],
  ['probe labels itself static-only', script.includes("mode: 'static-contract-only'")],
  ['probe records runtime limitations', script.includes('No live HTTP requests were sent.')],

  [
    'guard strictly requires Bearer token',
    /\/\^Bearer\\s\+\(\\S\+\)\$\/i\.exec\(authorization\.trim\(\)\)/.test(guard),
  ],
  [
    'guard verifies using configured JwtService',
    /this\.jwt\.verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)/.test(guard),
  ],
  [
    'guard catches invalid JWT verification',
    /catch\s*\{[\s\S]*?UnauthorizedException\(\s*['"]Invalid or expired session['"]\s*\)/.test(guard),
  ],
  [
    'guard validates JWT subject',
    /typeof subject\s*!==\s*['"]string['"][\s\S]*?24/.test(guard),
  ],
  [
    'guard checks database account status',
    /findById\(subject\)[\s\S]*?select\(['"]_id email role active['"]\)/.test(guard)
      && /account\.active\s*!==\s*true/.test(guard),
  ],
  [
    'guard performs role checks against authoritative account role',
    /roles\?\.length\s*&&\s*!roles\.includes\(account\.role\)/.test(guard),
  ],

  ['secret policy has no fallback secret', !/JWT_SECRET\s*\|\|\s*['"]/.test(policy)],
  ['production minimum length is enforced', /secret\.length\s*<\s*32/.test(policy)],
  ['placeholder secrets are rejected', policy.includes('PLACEHOLDERS.has(secret.toLowerCase())')],
  ['report contains fail-closed summary', script.includes('if (report.failed) process.exitCode = 1')],
  ['report records secret-source consistency caveat', script.includes('Guard verification uses the JwtService configured by AuthModule.')],
];

let failed = 0;

for (const [name, ok] of tests) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}

console.log(`Phase 185 contract tests: ${tests.length - failed}/${tests.length} passed`);

if (failed) process.exitCode = 1;
