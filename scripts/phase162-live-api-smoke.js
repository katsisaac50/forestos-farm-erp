#!/usr/bin/env node
'use strict';
// Opt-in, read-only HTTP smoke test. Never logs credentials, response bodies, or full URLs.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const report = { phase: 162, title: 'Live API Readiness Smoke Test', generatedAt: new Date().toISOString(), mode: 'read-only GET', checks: [], limitations: [] };
const add = (name, status, detail) => { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); };
const baseText = process.env.FORESTOS_TEST_API_BASE_URL;
const healthPath = process.env.FORESTOS_TEST_HEALTH_PATH || '/api/health';
const readPath = process.env.FORESTOS_TEST_READ_PATH;
const token = process.env.FORESTOS_TEST_API_TOKEN;
const out = path.join(root, 'PHASE162_LIVE_API_SMOKE_REPORT.json');
function save() { fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); console.log(`Report written: ${path.relative(root, out)}`); }
if (!baseText) {
  add('Live API smoke test', 'SKIP', 'set FORESTOS_TEST_API_BASE_URL to enable live requests');
  report.limitations.push('No live HTTP request was made because the API base URL was not configured.'); save();
} else {
  let base;
  try { base = new URL(baseText); } catch { add('Base URL safety', 'BLOCKED', 'configured API base URL is invalid'); process.exitCode = 1; save(); }
  if (base) {
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || (base.protocol === 'http:' && !['localhost','127.0.0.1','::1'].includes(base.hostname))) {
      add('Base URL safety', 'BLOCKED', 'use HTTPS, or HTTP only for localhost; do not embed credentials'); process.exitCode = 1; save();
    } else {
      function targetFor(p) { const u = new URL(p, base); if (u.origin !== base.origin || u.searchParams.has('token') || u.username || u.password) throw new Error('unsafe endpoint path'); return u; }
      async function get(url, withAuth) {
        const headers = { accept: 'application/json' };
        if (withAuth && token) headers.authorization = `Bearer ${token}`;
        const res = await fetch(url, { method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(10000) });
        return { status: res.status, contentType: res.headers.get('content-type') || '' };
      }
      (async () => {
        try {
          const health = await get(targetFor(healthPath), false);
          add('Health endpoint responds successfully', health.status >= 200 && health.status < 300 ? 'PASS' : 'FAIL', `HTTP ${health.status}`);
          if (!(health.status >= 200 && health.status < 300)) process.exitCode = 1;
          if (readPath) {
            if (!token) { add('Authenticated read smoke test', 'SKIP', 'FORESTOS_TEST_READ_PATH is set but FORESTOS_TEST_API_TOKEN is missing'); report.limitations.push('Protected read endpoint was not tested because no dedicated test token was configured.'); }
            else {
              const protectedResult = await get(targetFor(readPath), true);
              add('Authenticated read endpoint responds successfully', protectedResult.status >= 200 && protectedResult.status < 300 ? 'PASS' : 'FAIL', `HTTP ${protectedResult.status}`);
              if (!(protectedResult.status >= 200 && protectedResult.status < 300)) process.exitCode = 1;
            }
          } else add('Authenticated read smoke test', 'SKIP', 'optional FORESTOS_TEST_READ_PATH was not configured');
        } catch (e) { add('Live API request', 'FAIL', `${e.name}: request failed; configuration details omitted`); process.exitCode = 1; }
        report.limitations.push('GET smoke tests only establish endpoint reachability and status codes; they do not prove business correctness, authorization completeness, tenant isolation, or database durability.'); save();
      })();
    }
  }
}
