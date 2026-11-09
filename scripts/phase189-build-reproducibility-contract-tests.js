#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const apiPkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const auditSource = fs.readFileSync(path.join(__dirname, 'phase189-build-reproducibility-audit.js'), 'utf8');
const checks = [
  ['API build script is declared', () => assert.match(apiPkg.scripts.build, /nest build/)],
  ['Nest CLI is declared', () => assert.ok(apiPkg.devDependencies['@nestjs/cli'])],
  ['TypeScript config exists', () => assert.ok(fs.existsSync(path.join(root, 'apps/api/tsconfig.json')))],
  ['Audit checks for supported lockfile formats', () => assert.match(auditSource, /package-lock\.json.*npm-shrinkwrap\.json.*pnpm-lock\.yaml.*yarn\.lock/)],
  ['Audit reports missing lockfile as blocker', () => assert.match(auditSource, /BLOCKER: no API lockfile found/)],
  ['Audit checks installed NestJS core dependency', () => assert.match(auditSource, /node_modules\/\@nestjs\/core/)],
  ['Audit does not execute build automatically', () => assert.match(auditSource, /buildExecuted: false/)],
  ['Audit does not perform network requests', () => assert.match(auditSource, /does not install packages, execute the build, contact an API/)],
  ['Production clearance is always false in report', () => assert.match(auditSource, /productionCleared: false/)],
  ['Clean-install action is documented', () => assert.match(auditSource, /clean install/)],
  ['Phase 188 probe prerequisite is checked', () => assert.match(auditSource, /phase188-authentication-http-smoke\.js/)],
  ['Audit writes a JSON report', () => assert.match(auditSource, /PHASE189_BUILD_REPRODUCIBILITY_AUDIT\.json/)],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 189 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
