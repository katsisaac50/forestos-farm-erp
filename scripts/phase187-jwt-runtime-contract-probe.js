#!/usr/bin/env node
'use strict';
// Dependency-free HS256 behavior probe. This validates the intended JWT contract,
// not NestJS JwtService or a live ForestOS HTTP endpoint.
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const secretPolicy = require('../apps/api/src/auth/jwt-secret-policy');
const secret = secretPolicy.resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'phase187-runtime-probe-secret-with-more-than-32-chars' });
const b64url = value => Buffer.from(value).toString('base64url');
function sign(payload, key = secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const input = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', key).update(input).digest('base64url');
  return `${input}.${sig}`;
}
function verify(token, key = secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts.some(part => !part)) throw new Error('malformed token');
  let header, payload;
  try { header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); }
  catch { throw new Error('malformed token'); }
  if (header.alg !== 'HS256') throw new Error('unsupported algorithm');
  const expected = crypto.createHmac('sha256', key).update(`${parts[0]}.${parts[1]}`).digest();
  let actual;
  try { actual = Buffer.from(parts[2], 'base64url'); } catch { throw new Error('invalid signature'); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('invalid signature');
  if (payload.exp !== undefined && (!Number.isFinite(payload.exp) || nowSeconds >= payload.exp)) throw new Error('expired token');
  if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || nowSeconds < payload.nbf)) throw new Error('token not active');
  return payload;
}
function parseBearer(header) {
  const parts = String(header || '').split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) throw new Error('sign in required');
  return parts[1];
}
function requireRole(user, roles) { if (roles?.length && !roles.includes(user?.role)) throw new Error('forbidden'); return true; }
const now = 2_000_000_000;
const valid = sign({ sub: 'user-test', role: 'owner', exp: now + 60, nbf: now - 60 });
const checks = [
  ['valid HS256 token verifies and preserves claims', () => assert.equal(verify(valid, secret, now).role, 'owner')],
  ['wrong signing secret is rejected', () => assert.throws(() => verify(valid, 'wrong-key', now), /invalid signature/)],
  ['tampered payload is rejected', () => { const p=valid.split('.'); p[1]=b64url(JSON.stringify({sub:'attacker',role:'owner',exp:now+60})); assert.throws(()=>verify(p.join('.'),secret,now),/invalid signature/); }],
  ['expired token is rejected', () => assert.throws(() => verify(sign({sub:'u',exp:now-1}),secret,now), /expired token/)],
  ['not-before claim in the future is rejected', () => assert.throws(() => verify(sign({sub:'u',nbf:now+1}),secret,now), /not active/)],
  ['malformed token is rejected', () => assert.throws(() => verify('not.a.jwt.token',secret,now), /malformed token/)],
  ['unsupported algorithm is rejected', () => { const h=b64url(JSON.stringify({alg:'none',typ:'JWT'})); const p=b64url(JSON.stringify({sub:'u'})); const input=`${h}.${p}`; const sig=crypto.createHmac('sha256',secret).update(input).digest('base64url'); assert.throws(()=>verify(`${input}.${sig}`,secret,now),/unsupported algorithm/); }],
  ['Bearer header extracts token', () => assert.equal(parseBearer(`Bearer ${valid}`),valid)],
  ['missing Bearer token is rejected', () => assert.throws(() => parseBearer(''), /sign in required/)],
  ['wrong authorization scheme is rejected', () => assert.throws(() => parseBearer(`Basic ${valid}`), /sign in required/)],
  ['authorized role passes', () => assert.equal(requireRole({role:'owner'},['owner']),true)],
  ['unauthorized role is rejected', () => assert.throws(() => requireRole({role:'worker'},['owner']),/forbidden/)],
];
let failed=0;
for (const [name, run] of checks) { try { run(); console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(`\nPhase 187 dependency-free JWT contract probe: ${checks.length-failed}/${checks.length} passed`);
console.log('LIMITATION: This probe does not invoke NestJS JwtService, AuthGuard, HTTP routes, or MongoDB.');
process.exitCode = failed ? 1 : 0;
