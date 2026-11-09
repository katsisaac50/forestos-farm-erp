'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const guard = read('apps/api/src/auth/roles.guard.ts');
const controller = read('apps/api/src/auth/auth.controller.ts');
const policy = require(path.join(root, 'apps/api/src/auth/jwt-secret-policy.js'));

const checks = [
  [
    'guard strictly requires a Bearer token',
    /\/\^Bearer\\s\+\(\\S\+\)\$\/i\.exec\(authorization\.trim\(\)\)/.test(guard),
  ],
  [
    'guard verifies JWT asynchronously with configured JwtService',
    /this\.jwt\.verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)/.test(guard),
  ],
  [
    'guard maps JWT verification failures to unauthorized',
    /catch\s*\{[\s\S]*?UnauthorizedException\(\s*['"]Invalid or expired session['"]\s*\)/.test(guard),
  ],
  [
    'guard validates JWT subject as a MongoDB ObjectId',
    /typeof subject\s*!==\s*['"]string['"][\s\S]*?24/.test(guard),
  ],
  [
    'guard checks current account status in database',
    /this\.users\s*[\s\S]*?findById\(subject\)[\s\S]*?select\(['"]_id email role active['"]\)/.test(guard)
      && /!account\s*\|\|\s*account\.active\s*!==\s*true/.test(guard),
  ],
  [
    'guard enforces declared roles against database account role',
    /roles\?\.length\s*&&\s*!roles\.includes\(account\.role\)/.test(guard),
  ],
  [
    'login only selects active user',
    /findOne\(\{email:.*active:true\}\)/.test(controller),
  ],
  [
    'password comparison uses bcrypt',
    /bcrypt\.compare\(/.test(controller),
  ],
  [
    'setup requires configured owner setup key',
    /!process\.env\.OWNER_SETUP_KEY\|\|body\.setupKey!==process\.env\.OWNER_SETUP_KEY/.test(controller),
  ],
  [
    'owner setup is one-time guarded by user count',
    /countDocuments\(\{\}\)>0/.test(controller),
  ],
  [
    'JWT secret policy rejects absent secret',
    (() => {
      try {
        policy.resolveJwtSecret({ NODE_ENV: 'production' });
        return false;
      } catch (e) {
        return /JWT_SECRET must be configured/.test(e.message);
      }
    })(),
  ],
  [
    'JWT secret policy accepts valid production secret',
    (() => {
      try {
        return policy.resolveJwtSecret({
          NODE_ENV: 'production',
          JWT_SECRET: 'K9!secure-production-secret-2026-unique',
        }) === 'K9!secure-production-secret-2026-unique';
      } catch {
        return false;
      }
    })(),
  ],
];

const report = {
  phase: 185,
  title: 'Authentication Runtime Readiness - Static Contract Probe',
  generatedAt: new Date().toISOString(),
  mode: 'static-contract-only',
  checks: checks.map(([name, passed]) => ({ name, passed })),
  passed: checks.filter(x => x[1]).length,
  failed: checks.filter(x => !x[1]).length,
  limitations: [
    'No NestJS process was started.',
    'No live HTTP requests were sent.',
    'No MongoDB connection was used.',
    'Static checks do not prove runtime behavior or tenant isolation.',
    'Guard verification uses the JwtService configured by AuthModule. Static checks do not prove live NestJS verification.',
  ],
};

fs.writeFileSync(
  path.join(root, 'PHASE185_AUTH_RUNTIME_READINESS.json'),
  JSON.stringify(report, null, 2) + '\n',
);

console.log(`Phase 185 static readiness: ${report.passed}/${checks.length} passed`);

for (const c of checks) {
  console.log(`${c[1] ? 'PASS' : 'FAIL'} ${c[0]}`);
}

if (report.failed) process.exitCode = 1;
