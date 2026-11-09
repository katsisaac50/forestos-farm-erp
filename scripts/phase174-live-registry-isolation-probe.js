#!/usr/bin/env node
'use strict';
// Opt-in read-only HTTP probe. Uses only GET requests and never prints credentials or response bodies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = { phase: 174, title: 'Live Cross-Tenant Registry Isolation Probe', generatedAt: new Date().toISOString(), mode: 'read-only HTTP GET', decision: 'NOT VERIFIED', checks: [], limitations: [] };
const reportPath = path.join(root, 'PHASE174_LIVE_REGISTRY_ISOLATION_REPORT.json');
function add(name, status, detail) { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); }
function finish() {
  const failed = report.checks.some(c => c.status === 'FAIL' || c.status === 'BLOCKED');
  const skipped = report.checks.some(c => c.status === 'SKIP');
  report.decision = failed ? 'FAIL — investigate security findings' : skipped ? 'NOT VERIFIED — configuration incomplete' : 'PROBE PASSED — configured read endpoints only';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report written: ${path.relative(root, reportPath)}`);
  if (failed) process.exitCode = 1;
}
const required = ['FORESTOS_TEST_API_BASE_URL','FORESTOS_TEST_TENANT_A_TOKEN','FORESTOS_TEST_TENANT_B_TOKEN','FORESTOS_TEST_TENANT_A_ID','FORESTOS_TEST_TENANT_B_ID','FORESTOS_TEST_TENANT_A_READ_PATH','FORESTOS_TEST_TENANT_B_READ_PATH','FORESTOS_TEST_TENANT_A_RECORD_MARKER','FORESTOS_TEST_TENANT_B_RECORD_MARKER'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  add('Live registry isolation configuration', 'SKIP', `missing required opt-in settings: ${missing.join(', ')}`);
  report.limitations.push('No HTTP requests were made because required dedicated non-production test configuration is incomplete.');
  finish();
} else {
  let base;
  try { base = new URL(process.env.FORESTOS_TEST_API_BASE_URL); } catch { base = null; }
  const aid = process.env.FORESTOS_TEST_TENANT_A_ID, bid = process.env.FORESTOS_TEST_TENANT_B_ID;
  const at = process.env.FORESTOS_TEST_TENANT_A_TOKEN, bt = process.env.FORESTOS_TEST_TENANT_B_TOKEN;
  if (!base || !['http:','https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    add('API base URL safety', 'BLOCKED', 'Base URL must be HTTP(S), with no embedded credentials, query, or fragment'); finish();
  } else if (aid === bid || at === bt || process.env.FORESTOS_TEST_TENANT_A_RECORD_MARKER === process.env.FORESTOS_TEST_TENANT_B_RECORD_MARKER) {
    add('Distinct test tenant and record identities', 'BLOCKED', 'Tenant IDs, tokens, and record markers must be distinct'); finish();
  } else {
    function target(raw) { const u = new URL(raw, base); if (u.origin !== base.origin || u.username || u.password || u.searchParams.has('token') || u.searchParams.has('access_token')) throw new Error('unsafe target'); return u; }
    let a, b;
    try { a = target(process.env.FORESTOS_TEST_TENANT_A_READ_PATH); b = target(process.env.FORESTOS_TEST_TENANT_B_READ_PATH); }
    catch { add('Read endpoint safety', 'BLOCKED', 'Endpoint paths must stay on the configured origin and must not contain credentials'); finish(); }
    if (a && b) {
      async function get(url, token) {
        const r = await fetch(url, { method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${token}` }, redirect: 'manual', signal: AbortSignal.timeout(12000) });
        const raw = await r.text();
        let body = null; try { body = JSON.parse(raw); } catch {}
        return { status: r.status, body, raw, bytes: Buffer.byteLength(raw) };
      }
      function allObjects(v, out = []) { if (Array.isArray(v)) v.forEach(x => allObjects(x,out)); else if (v && typeof v === 'object') { out.push(v); Object.values(v).forEach(x => allObjects(x,out)); } return out; }
      function tenantIds(body) { return [...new Set(allObjects(body).flatMap(o => ['tenantId','organizationId','tenant_id','organization_id'].filter(k => typeof o[k] === 'string').map(k => o[k])))]; }
      (async () => {
        try {
          const [ra, rb] = await Promise.all([get(a, at), get(b, bt)]);
          const aIds = tenantIds(ra.body), bIds = tenantIds(rb.body);
          const am = process.env.FORESTOS_TEST_TENANT_A_RECORD_MARKER, bm = process.env.FORESTOS_TEST_TENANT_B_RECORD_MARKER;
          add('Tenant A endpoint returns HTTP 200', ra.status === 200 ? 'PASS' : 'FAIL', `HTTP ${ra.status}`);
          add('Tenant B endpoint returns HTTP 200', rb.status === 200 ? 'PASS' : 'FAIL', `HTTP ${rb.status}`);
          add('Tenant A response contains expected tenant ID only', ra.status === 200 && aIds.includes(aid) && !aIds.includes(bid) ? 'PASS' : 'FAIL', 'Only identifier presence is logged; response body is never printed');
          add('Tenant B response contains expected tenant ID only', rb.status === 200 && bIds.includes(bid) && !bIds.includes(aid) ? 'PASS' : 'FAIL', 'Only identifier presence is logged; response body is never printed');
          add('Tenant A response contains its test record marker', ra.status === 200 && ra.raw.includes(am) ? 'PASS' : 'FAIL', 'Marker presence only; no response content is logged');
          add('Tenant A response excludes Tenant B test record marker', ra.status === 200 && !ra.raw.includes(bm) ? 'PASS' : 'FAIL', 'Cross-tenant marker absence is checked');
          add('Tenant B response contains its test record marker', rb.status === 200 && rb.raw.includes(bm) ? 'PASS' : 'FAIL', 'Marker presence only; no response content is logged');
          add('Tenant B response excludes Tenant A test record marker', rb.status === 200 && !rb.raw.includes(am) ? 'PASS' : 'FAIL', 'Cross-tenant marker absence is checked');
          add('Response size safety ceiling', ra.bytes <= 2*1024*1024 && rb.bytes <= 2*1024*1024 ? 'PASS' : 'FAIL', 'Each response must be no larger than 2 MiB');
          report.limitations.push('This probe checks only two configured GET endpoints and marker/tenant-ID visibility. It does not test writes, role matrices, all routes, pagination, indirect leaks, or prove application-wide security.');
          if (ra.bytes > 2*1024*1024 || rb.bytes > 2*1024*1024) report.limitations.push('A response exceeded the 2 MiB safety ceiling.');
        } catch (e) {
          add('Live HTTP probe', 'FAIL', `${e.name}: request failed or timed out; sensitive details omitted`);
          report.limitations.push('At least one request failed. Credentials and response bodies are not logged.');
        }
        finish();
      })();
    }
  }
}
