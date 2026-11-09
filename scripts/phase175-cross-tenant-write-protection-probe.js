#!/usr/bin/env node
'use strict';
// Opt-in mutation probe for disposable environments only. A cross-tenant PATCH is attempted,
// then the owner tenant re-reads the fixture to verify its marker was not changed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = { phase: 175, title: 'Cross-Tenant Write Protection & Mutation Integrity', generatedAt: new Date().toISOString(), mode: 'opt-in disposable-environment PATCH probe', decision: 'NOT VERIFIED', checks: [], limitations: [] };
const reportPath = path.join(root, 'PHASE175_CROSS_TENANT_WRITE_PROTECTION_REPORT.json');
function add(name, status, detail) { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); }
function finish() {
  const failed = report.checks.some(c => c.status === 'FAIL' || c.status === 'BLOCKED');
  const skipped = report.checks.some(c => c.status === 'SKIP');
  report.decision = failed ? 'FAIL — investigate mutation protection' : skipped ? 'NOT VERIFIED — configuration incomplete' : 'PROBE PASSED — configured mutation scenario only';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report written: ${path.relative(root, reportPath)}`);
  if (failed) process.exitCode = 1;
}
const required = ['FORESTOS_TEST_API_BASE_URL','FORESTOS_TEST_TENANT_A_TOKEN','FORESTOS_TEST_TENANT_B_TOKEN','FORESTOS_TEST_TENANT_A_ID','FORESTOS_TEST_TENANT_B_ID','FORESTOS_TEST_TENANT_B_READ_PATH','FORESTOS_TEST_TENANT_B_RECORD_MARKER','FORESTOS_TEST_CROSS_TENANT_PATCH_PATH','FORESTOS_TEST_CROSS_TENANT_PATCH_JSON'];
const missing = required.filter(k => !process.env[k]);
if (process.env.FORESTOS_TEST_ALLOW_MUTATIONS !== 'YES' || process.env.FORESTOS_TEST_ENVIRONMENT !== 'disposable') {
  add('Mutation safety opt-in', 'SKIP', 'Requires FORESTOS_TEST_ALLOW_MUTATIONS=YES and FORESTOS_TEST_ENVIRONMENT=disposable; no HTTP requests made');
  report.limitations.push('No requests were made. This probe can mutate only a dedicated disposable test fixture and must never target production.'); finish();
} else if (missing.length) {
  add('Mutation probe configuration', 'SKIP', `missing required settings: ${missing.join(', ')}`);
  report.limitations.push('No HTTP requests were made because dedicated test configuration is incomplete.'); finish();
} else {
  let base, patchPayload;
  try { base = new URL(process.env.FORESTOS_TEST_API_BASE_URL); patchPayload = JSON.parse(process.env.FORESTOS_TEST_CROSS_TENANT_PATCH_JSON); }
  catch { base = null; }
  const aid = process.env.FORESTOS_TEST_TENANT_A_ID, bid = process.env.FORESTOS_TEST_TENANT_B_ID;
  const at = process.env.FORESTOS_TEST_TENANT_A_TOKEN, bt = process.env.FORESTOS_TEST_TENANT_B_TOKEN;
  if (!base || !['http:','https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    add('API base URL safety', 'BLOCKED', 'Base URL must be HTTP(S), with no embedded credentials, query, or fragment'); finish();
  } else if (aid === bid || at === bt || !patchPayload || typeof patchPayload !== 'object' || Array.isArray(patchPayload)) {
    add('Distinct tenant credentials and JSON payload', 'BLOCKED', 'Tenant IDs and tokens must differ; PATCH payload must be a JSON object'); finish();
  } else {
    function target(raw) { const u = new URL(raw, base); if (u.origin !== base.origin || u.username || u.password || u.searchParams.has('token') || u.searchParams.has('access_token')) throw new Error('unsafe target'); return u; }
    let readUrl, patchUrl;
    try { readUrl = target(process.env.FORESTOS_TEST_TENANT_B_READ_PATH); patchUrl = target(process.env.FORESTOS_TEST_CROSS_TENANT_PATCH_PATH); }
    catch { add('Endpoint path safety', 'BLOCKED', 'Paths must remain on configured origin and contain no credentials'); finish(); }
    if (readUrl && patchUrl) {
      async function request(url, token, method, body) {
        const opts = { method, headers: { accept: 'application/json', authorization: `Bearer ${token}` }, redirect: 'manual', signal: AbortSignal.timeout(12000) };
        if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
        const r = await fetch(url, opts); const raw = await r.text();
        return { status: r.status, raw, bytes: Buffer.byteLength(raw) };
      }
      (async () => {
        try {
          const before = await request(readUrl, bt, 'GET');
          const marker = process.env.FORESTOS_TEST_TENANT_B_RECORD_MARKER;
          add('Tenant B fixture readable before mutation', before.status === 200 && before.raw.includes(marker) ? 'PASS' : 'FAIL', `HTTP ${before.status}; marker presence only`);
          if (before.status !== 200 || !before.raw.includes(marker)) {
            add('Cross-tenant mutation attempt', 'BLOCKED', 'Skipped because the owner fixture could not be verified before the attempt');
          } else {
            const attempted = await request(patchUrl, at, 'PATCH', patchPayload);
            const denied = [401,403,404].includes(attempted.status);
            add('Tenant A PATCH against Tenant B fixture is denied', denied ? 'PASS' : 'FAIL', `HTTP ${attempted.status}; expected 401, 403, or 404`);
            const after = await request(readUrl, bt, 'GET');
            add('Tenant B fixture marker remains unchanged', after.status === 200 && after.raw.includes(marker) ? 'PASS' : 'FAIL', `HTTP ${after.status}; marker presence only`);
            add('Response-size safety ceiling', before.bytes <= 2*1024*1024 && attempted.bytes <= 2*1024*1024 && after.bytes <= 2*1024*1024 ? 'PASS' : 'FAIL', 'Each response must be no larger than 2 MiB');
          }
          report.limitations.push('This probe tests one configured PATCH attempt and a marker-based follow-up read. It does not test DELETE, all mutation routes, role matrices, concurrent writes, or application-wide security. A denied status alone is insufficient without the unchanged-fixture check.');
        } catch (e) { add('Live mutation probe', 'FAIL', `${e.name}: request failed or timed out; sensitive details omitted`); report.limitations.push('At least one request failed; credentials and response bodies are never logged. Inspect the disposable fixture before retrying.'); }
        finish();
      })();
    }
  }
}
