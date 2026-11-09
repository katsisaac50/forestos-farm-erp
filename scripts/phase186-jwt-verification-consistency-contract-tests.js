
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const guard = read('apps/api/src/auth/roles.guard.ts');
const moduleSource = read('apps/api/src/auth/auth.module.ts');
const controller = read('apps/api/src/auth/auth.controller.ts');

const checks = [
  [
    'guard delegates verification to configured JwtService',
    () => assert.match(guard, /this\.jwt\.verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)/),
  ],
  [
    'guard does not override verification secret from process.env',
    () => assert.doesNotMatch(guard, /verifyAsync[\s\S]{0,100}process\.env\.JWT_SECRET/),
  ],
  [
    'startup module uses validated secret policy',
    () => assert.match(moduleSource, /secret:\s*resolveJwtSecret\(process\.env\)/),
  ],
  [
    'startup module does not add a default secret',
    () => assert.doesNotMatch(moduleSource, /JWT_SECRET\s*\|\|\s*['"`]/),
  ],
  [
    'token signing uses configured JwtService',
    () => assert.match(controller, /this\.jwt\.sign\(payload\)/),
  ],
  [
    'token verification failure is caught and mapped to unauthorized',
    () => {
      assert.match(
        guard,
        /try\s*\{[\s\S]*?verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)[\s\S]*?\}\s*catch\s*\{[\s\S]*?UnauthorizedException\(\s*['"]Invalid or expired session['"]\s*\)/,
      );
    },
  ],
  [
    'strict Bearer token remains required',
    () => assert.match(
      guard,
      /\/\^Bearer\\s\+\(\\S\+\)\$\/i\.exec\(authorization\.trim\(\)\)/,
    ),
  ],
  [
    'JWT subject is validated as a MongoDB ObjectId',
    () => {
      assert.match(guard, /typeof subject\s*!==\s*['"]string['"]/);
      assert.match(guard, /24/);
    },
  ],
  [
    'database account must exist and be active',
    () => {
      assert.match(guard, /findById\(subject\)[\s\S]*?select\(['"]_id email role active['"]\)/);
      assert.match(guard, /!account\s*\|\|\s*account\.active\s*!==\s*true/);
    },
  ],
  [
    'role authorization uses current database role',
    () => assert.match(guard, /roles\?\.length\s*&&\s*!roles\.includes\(account\.role\)/),
  ],
  [
    'secret policy still rejects missing secret',
    () => {
      const policy = require(path.join(root, 'apps/api/src/auth/jwt-secret-policy.js'));
      assert.throws(
        () => policy.resolveJwtSecret({ NODE_ENV: 'production' }),
        /must be configured/,
      );
    },
  ],
  [
    'secret policy still rejects short production secret',
    () => {
      const policy = require(path.join(root, 'apps/api/src/auth/jwt-secret-policy.js'));
      assert.throws(
        () => policy.resolveJwtSecret({
          NODE_ENV: 'production',
          JWT_SECRET: 'short-secret',
        }),
        /at least 32/,
      );
    },
  ],
  [
    'phase report explicitly marks live runtime tests as not run',
    () => {
      const report = JSON.parse(read('PHASE186_JWT_VERIFICATION_CONSISTENCY.json'));
      assert.equal(report.liveRuntimeTestsRun, false);
      assert.equal(report.productionCleared, false);
    },
  ],
  [
    'phase report has no failed static checks',
    () => {
      const report = JSON.parse(read('PHASE186_JWT_VERIFICATION_CONSISTENCY.json'));
      assert.equal(report.failed, 0);
    },
  ],
];

let failed = 0;

for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

console.log(`\nPhase 186 contract tests: ${checks.length - failed}/${checks.length} passed`);

process.exitCode = failed ? 1 : 0;
