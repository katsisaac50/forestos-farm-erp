#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseBaseUrl } = require('./phase188-authentication-http-smoke');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'phase188-authentication-http-smoke.js'), 'utf8');
const authGuard = fs.readFileSync(path.join(root, 'apps/api/src/auth/roles.guard.ts'), 'utf8');
const checks = [
 ['probe requires explicit non-production opt-in', () => assert.match(source, /FORESTOS_ALLOW_HTTP_PROBE !== 'YES'/)],
 ['probe refuses credentials embedded in base URL', () => assert.throws(() => parseBaseUrl('http://user:pass@localhost:4000'))],
 ['probe accepts local HTTP origin', () => assert.equal(parseBaseUrl('http://127.0.0.1:4000').origin, 'http://127.0.0.1:4000')],
 ['probe rejects unsupported URL protocols', () => assert.throws(() => parseBaseUrl('file:///tmp/test'))],
 ['probe sends GET only and disables redirects', () => assert.match(source, /method: 'GET'/) && assert.match(source, /redirect: 'error'/)],
 ['probe checks missing and invalid token rejection', () => assert.match(source, /missing bearer token rejected/) && assert.match(source, /invalid bearer token rejected/)],
 ['valid-token test is opt-in and never logs token', () => assert.match(source, /FORESTOS_HTTP_PROBE_VALID_TOKEN/) && assert.match(source, /tokensLogged: false/)],
 ['probe restricts endpoint to same origin', () => assert.match(source, /target\.origin !== base\.origin/)],
 ['probe has bounded timeout and response size', () => assert.match(source, /15000/) && assert.match(source, /slice\(0, 16384\)/)],
 ['application guard uses configured JwtService', () => assert.match(authGuard, /verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)/)],
 ['report never grants production clearance', () => assert.match(source, /productionCleared: false/)],
 ['no mutating HTTP verbs are used', () => assert.doesNotMatch(source, /method: '(POST|PUT|PATCH|DELETE)'/)],
];
let failed = 0;
for (const [name, fn] of checks) { try { fn(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 188 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
