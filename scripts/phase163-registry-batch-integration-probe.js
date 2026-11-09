#!/usr/bin/env node
'use strict';
// Opt-in write probe for a disposable ForestOS test database. Never logs tokens or response bodies.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const report = { phase: 163, title: 'Registry Batch Live Integration Probe', generatedAt: new Date().toISOString(), mode: 'opt-in POST + idempotent replay', checks: [], limitations: [] };
const out = path.join(root, 'PHASE163_REGISTRY_BATCH_INTEGRATION_REPORT.json');
const add = (name, status, detail) => { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); };
const save = () => { fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); console.log(`Report written: ${path.relative(root, out)}`); };
const baseText = process.env.FORESTOS_TEST_API_BASE_URL;
const token = process.env.FORESTOS_TEST_API_TOKEN;
const tenantId = process.env.FORESTOS_TEST_TENANT_ID;
const dbName = process.env.FORESTOS_TEST_DATABASE_NAME || '';
const endpoint = process.env.FORESTOS_TEST_REGISTRY_BATCH_PATH || '/api/registry-persistence/batches';
if (!baseText || !token || !tenantId || process.env.FORESTOS_TEST_ALLOW_WRITES !== 'YES' || !/(^|[_-])test([_-]|$)/i.test(dbName)) {
  add('Write-safety preconditions', 'BLOCKED', 'requires API URL, dedicated token, tenant ID, FORESTOS_TEST_ALLOW_WRITES=YES, and a test database name containing a standalone test marker');
  report.limitations.push('No request was sent; write probe requires explicit opt-in and a clearly named disposable test database.'); save(); process.exitCode = 2;
} else {
  let base;
  try { base = new URL(baseText); } catch { base = null; }
  let target;
  try {
    if (!base || !['http:', 'https:'].includes(base.protocol) || base.username || base.password || (base.protocol === 'http:' && !['localhost','127.0.0.1','::1'].includes(base.hostname))) throw new Error();
    target = new URL(endpoint, base);
    if (target.origin !== base.origin || target.search || target.username || target.password || target.hash || !target.pathname.startsWith('/')) throw new Error();
  } catch {
    add('Endpoint safety', 'BLOCKED', 'use a valid HTTPS API origin (HTTP allowed only for localhost) and same-origin path without query parameters'); save(); process.exitCode = 2;
  }
  if (target) (async () => {
    const nonce = crypto.randomUUID();
    const payload = { batchId: `phase163-${nonce}`, expectedRevision: undefined, incoming: [{ domain: 'phase163_probe', recordId: nonce, recordedAt: new Date().toISOString(), payload: { purpose: 'integration-probe', nonce }, operation: 'create' }] };
    // JSON serialization deliberately omits undefined expectedRevision.
    async function post() {
      const res = await fetch(target, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      let data = null; try { data = await res.json(); } catch {}
      return { status: res.status, data };
    }
    try {
      const first = await post();
      const firstOk = first.status >= 200 && first.status < 300 && first.data?.committed === true && first.data?.tenantId === tenantId;
      add('Initial registry batch commit', firstOk ? 'PASS' : 'FAIL', `HTTP ${first.status}; response contract ${firstOk ? 'matched' : 'did not match'}`);
      if (!firstOk) { process.exitCode = 1; report.limitations.push('Replay was not attempted because initial commit did not satisfy expected response contract.'); }
      else {
        const replay = await post();
        const replayOk = replay.status >= 200 && replay.status < 300 && replay.data?.committed === true && replay.data?.idempotent === true && replay.data?.tenantId === tenantId && replay.data?.commit?.commitId === first.data?.commit?.commitId;
        add('Idempotent replay returns original commit', replayOk ? 'PASS' : 'FAIL', `HTTP ${replay.status}; original commit identity ${replayOk ? 'preserved' : 'not verified'}`);
        if (!replayOk) process.exitCode = 1;
      }
    } catch (e) { add('Registry batch request', 'FAIL', `${e.name}: request failed; response details omitted`); process.exitCode = 1; }
    report.limitations.push('This probe writes one uniquely named test record. It verifies only the configured endpoint and replay contract; it does not replace a full transaction, rollback, concurrency, or tenant-isolation suite.');
    save();
  })();
}
