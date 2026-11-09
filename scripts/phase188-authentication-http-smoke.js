#!/usr/bin/env node
'use strict';
// Opt-in read-only smoke test against a running, non-production ForestOS API.
// Only GET requests are issued; no tokens or response bodies are printed.
const assert = require('node:assert/strict');

function parseBaseUrl(raw) {
  if (!raw) throw new Error('Set FORESTOS_HTTP_PROBE_BASE_URL to the non-production API origin.');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http:// or https:// targets are supported.');
  if (url.username || url.password || url.search || url.hash) throw new Error('Base URL must not contain credentials, query, or fragment.');
  return url;
}

async function request(url, token, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(url, { method: 'GET', headers, redirect: 'error', signal: controller.signal });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 16384), contentType: response.headers.get('content-type') || '' };
  } finally { clearTimeout(timer); }
}

async function run(env = process.env) {
  if (env.FORESTOS_ALLOW_HTTP_PROBE !== 'YES') {
    throw new Error('Safety gate: set FORESTOS_ALLOW_HTTP_PROBE=YES only after confirming the target is a dedicated non-production environment.');
  }
  const base = parseBaseUrl(env.FORESTOS_HTTP_PROBE_BASE_URL);
  const path = env.FORESTOS_HTTP_PROBE_PROTECTED_PATH || '/api/auth/me';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new Error('Protected path must be an absolute same-origin path.');
  const target = new URL(path, base);
  if (target.origin !== base.origin) throw new Error('Cross-origin probe paths are not allowed.');
  const timeoutMs = Math.min(Math.max(Number(env.FORESTOS_HTTP_PROBE_TIMEOUT_MS || 5000), 500), 15000);
  const results = [];
  const unauth = await request(target, null, timeoutMs);
  assert.equal(unauth.status, 401, `Unauthenticated protected GET should return 401; received ${unauth.status}`);
  results.push({ check: 'missing bearer token rejected', status: unauth.status, passed: true });
  const invalid = await request(target, 'invalid.phase188.token', timeoutMs);
  assert.equal(invalid.status, 401, `Invalid bearer token should return 401; received ${invalid.status}`);
  results.push({ check: 'invalid bearer token rejected', status: invalid.status, passed: true });
  if (env.FORESTOS_HTTP_PROBE_VALID_TOKEN) {
    const valid = await request(target, env.FORESTOS_HTTP_PROBE_VALID_TOKEN, timeoutMs);
    assert.equal(valid.status, 200, `Configured valid token should return 200; received ${valid.status}`);
    let payload;
    try { payload = JSON.parse(valid.body); } catch { throw new Error('Valid-token response was not JSON. Response body withheld.'); }
    assert.ok(payload && typeof payload === 'object' && !Array.isArray(payload), 'Expected a JSON object for authenticated profile.');
    results.push({ check: 'configured valid bearer token accepted', status: valid.status, passed: true });
  } else {
    results.push({ check: 'configured valid bearer token accepted', skipped: true, reason: 'FORESTOS_HTTP_PROBE_VALID_TOKEN not provided' });
  }
  const report = { phase: 188, generatedAt: new Date().toISOString(), targetOrigin: base.origin, protectedPath: path, requestsAreReadOnly: true, responseBodiesLogged: false, tokensLogged: false, results, liveHttpTestRun: true, productionCleared: false };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) run().catch(error => { console.error(`Phase 188 HTTP smoke probe failed: ${error.message}`); process.exitCode = 1; });
module.exports = { parseBaseUrl, run };
