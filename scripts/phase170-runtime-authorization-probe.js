#!/usr/bin/env node
'use strict';
// Opt-in, read-only runtime authorization probe. Never logs tokens or response bodies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = { phase: 170, title: 'Runtime Authorization & Cross-Tenant Verification Probe', generatedAt: new Date().toISOString(), mode: 'read-only HTTP GET', decision: 'NOT VERIFIED', checks: [], limitations: [] };
const add = (name, status, detail) => { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); };
const required = ['FORESTOS_TEST_API_BASE_URL','FORESTOS_TEST_TENANT_A_TOKEN','FORESTOS_TEST_TENANT_B_TOKEN','FORESTOS_TEST_TENANT_A_ID','FORESTOS_TEST_TENANT_B_ID','FORESTOS_TEST_TENANT_A_READ_PATH','FORESTOS_TEST_TENANT_B_READ_PATH'];
const missing = required.filter(k => !process.env[k]);
const reportPath = path.join(root, 'PHASE170_RUNTIME_AUTHORIZATION_REPORT.json');
function finish() {
  const failures = report.checks.some(c => c.status === 'FAIL' || c.status === 'BLOCKED');
  const skips = report.checks.some(c => c.status === 'SKIP');
  report.decision = failures ? 'FAIL — security verification failed' : skips ? 'NOT VERIFIED — configuration incomplete' : 'PROBE PASSED — limited to configured read-only endpoints';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report written: ${path.relative(root, reportPath)}`);
  if (failures) process.exitCode = 1;
}
if (missing.length) {
  add('Runtime authorization probe configuration', 'SKIP', `missing opt-in configuration: ${missing.join(', ')}`);
  report.limitations.push('No HTTP requests were made. Configure two dedicated test tenants and their read-only endpoint paths to run the probe.');
  finish();
} else {
  let base;
  try { base = new URL(process.env.FORESTOS_TEST_API_BASE_URL); } catch { base = null; }
  if (!base || !['http:','https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    add('API base URL safety', 'BLOCKED', 'Base URL must be HTTP(S), contain no credentials, query, or fragment'); finish();
  } else if (process.env.FORESTOS_TEST_TENANT_A_ID === process.env.FORESTOS_TEST_TENANT_B_ID || process.env.FORESTOS_TEST_TENANT_A_TOKEN === process.env.FORESTOS_TEST_TENANT_B_TOKEN) {
    add('Distinct test identities', 'BLOCKED', 'Tenant IDs and bearer tokens must be distinct'); finish();
  } else {
    function safeTarget(raw) {
      const target = new URL(raw, base);
      if (target.origin !== base.origin || target.username || target.password || target.searchParams.has('token') || target.searchParams.has('access_token')) throw new Error('unsafe endpoint path');
      return target;
    }
    let targetA, targetB;
    try { targetA = safeTarget(process.env.FORESTOS_TEST_TENANT_A_READ_PATH); targetB = safeTarget(process.env.FORESTOS_TEST_TENANT_B_READ_PATH); }
    catch { add('Read endpoint safety', 'BLOCKED', 'Paths must remain on the configured origin and must not embed credentials or token query parameters'); finish(); }
    if (targetA && targetB) {
      async function request(target, token) {
        const headers = { accept: 'application/json' };
        if (token !== null) headers.authorization = `Bearer ${token}`;
        const res = await fetch(target, { method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(12000) });
        const raw = await res.text();
        let body = null; try { body = JSON.parse(raw); } catch {}
        return { status: res.status, body, bytes: Buffer.byteLength(raw) };
      }
      function objects(value, out = []) { if (Array.isArray(value)) value.forEach(v => objects(v, out)); else if (value && typeof value === 'object') { out.push(value); Object.values(value).forEach(v => objects(v,out)); } return out; }
      function tenantIds(body) { return [...new Set(objects(body).flatMap(o => ['tenantId','organizationId','tenant_id','organization_id'].filter(k => typeof o[k] === 'string').map(k => o[k])))]; }
      (async () => {
        try {
          const [a,b,noToken,invalid] = await Promise.all([
            request(targetA, process.env.FORESTOS_TEST_TENANT_A_TOKEN),
            request(targetB, process.env.FORESTOS_TEST_TENANT_B_TOKEN),
            request(targetA, null),
            request(targetA, 'forestos-intentionally-invalid-test-token')
          ]);
          const aid = process.env.FORESTOS_TEST_TENANT_A_ID, bid = process.env.FORESTOS_TEST_TENANT_B_ID;
          const av = tenantIds(a.body), bv = tenantIds(b.body);
          add('Tenant A authenticated read', a.status === 200 ? 'PASS' : 'FAIL', `HTTP ${a.status}`);
          add('Tenant B authenticated read', b.status === 200 ? 'PASS' : 'FAIL', `HTTP ${b.status}`);
          add('Tenant A response is scoped to A', a.status === 200 && av.includes(aid) && !av.includes(bid) ? 'PASS' : 'FAIL', 'Only tenant identifiers are inspected; response body is never printed');
          add('Tenant B response is scoped to B', b.status === 200 && bv.includes(bid) && !bv.includes(aid) ? 'PASS' : 'FAIL', 'Only tenant identifiers are inspected; response body is never printed');
          add('Missing token rejected', [401,403].includes(noToken.status) ? 'PASS' : 'FAIL', `HTTP ${noToken.status}; expected 401 or 403`);
          add('Invalid token rejected', [401,403].includes(invalid.status) ? 'PASS' : 'FAIL', `HTTP ${invalid.status}; expected 401 or 403`);
          add('Response size safety ceiling', [a,b,noToken,invalid].every(r => r.bytes <= 2*1024*1024) ? 'PASS' : 'FAIL', 'Each response must be no larger than 2 MiB');
          if ([a,b,noToken,invalid].some(r => r.bytes > 2*1024*1024)) report.limitations.push('A response exceeded 2 MiB; consider a narrower test endpoint.');
          report.limitations.push('This probe checks only configured GET endpoints and visible tenant identifier fields. It does not prove write-path isolation, role policy correctness, or application-wide security.');
        } catch (e) {
          add('Runtime HTTP probe', 'FAIL', `${e.name}: request failed; sensitive details omitted`);
          report.limitations.push('At least one request failed or timed out; no response body or credential was logged.');
        }
        finish();
      })();
    }
  }
}
