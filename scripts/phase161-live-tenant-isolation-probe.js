#!/usr/bin/env node
'use strict';
// Opt-in, read-only HTTP probe. It never logs bearer tokens or response bodies.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const report = { phase: 161, title: 'Live API Tenant Isolation Probe', generatedAt: new Date().toISOString(), mode: 'read-only GET', checks: [], limitations: [] };
const add = (name, status, detail) => { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); };
const required = ['FORESTOS_TEST_API_BASE_URL','FORESTOS_TEST_TENANT_A_TOKEN','FORESTOS_TEST_TENANT_B_TOKEN','FORESTOS_TEST_TENANT_A_ID','FORESTOS_TEST_TENANT_B_ID','FORESTOS_TEST_READ_PATH'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  add('Live tenant isolation probe', 'SKIP', `missing opt-in configuration: ${missing.join(', ')}`);
  report.limitations.push('No live HTTP requests were made; configure two dedicated test tenants and read-only endpoint path to enable the probe.');
} else {
  const base = new URL(process.env.FORESTOS_TEST_API_BASE_URL);
  if (!['http:','https:'].includes(base.protocol) || base.username || base.password) {
    add('Base URL safety', 'BLOCKED', 'base URL must use HTTP(S) and must not embed credentials'); process.exitCode = 1;
  } else if (process.env.FORESTOS_TEST_TENANT_A_ID === process.env.FORESTOS_TEST_TENANT_B_ID || process.env.FORESTOS_TEST_TENANT_A_TOKEN === process.env.FORESTOS_TEST_TENANT_B_TOKEN) {
    add('Distinct test identities', 'BLOCKED', 'tenant IDs and bearer tokens must be distinct'); process.exitCode = 1;
  } else {
    const route = process.env.FORESTOS_TEST_READ_PATH;
    const target = new URL(route, base);
    if (target.origin !== base.origin || target.searchParams.has('token')) {
      add('Endpoint safety', 'BLOCKED', 'read path must remain on the configured API origin and must not place tokens in query parameters'); process.exitCode = 1;
    } else {
      async function get(token) {
        const res = await fetch(target, { method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        let body = null; try { body = await res.json(); } catch {}
        return { status: res.status, body };
      }
      function flatten(v, out = []) { if (Array.isArray(v)) v.forEach(x => flatten(x,out)); else if (v && typeof v === 'object') { out.push(v); Object.values(v).forEach(x => flatten(x,out)); } return out; }
      function tenantValues(body) { return flatten(body).flatMap(o => ['tenantId','organizationId','tenant_id','organization_id'].filter(k => typeof o[k] === 'string').map(k => o[k])); }
      (async () => {
        try {
          const [a,b] = await Promise.all([get(process.env.FORESTOS_TEST_TENANT_A_TOKEN), get(process.env.FORESTOS_TEST_TENANT_B_TOKEN)]);
          add('Tenant A authenticated read', a.status === 200 ? 'PASS' : 'FAIL', `HTTP ${a.status}`);
          add('Tenant B authenticated read', b.status === 200 ? 'PASS' : 'FAIL', `HTTP ${b.status}`);
          const av = tenantValues(a.body), bv = tenantValues(b.body), aid = process.env.FORESTOS_TEST_TENANT_A_ID, bid = process.env.FORESTOS_TEST_TENANT_B_ID;
          const aNoB = !av.includes(bid), bNoA = !bv.includes(aid);
          add('Tenant A response excludes Tenant B identifiers', aNoB && av.includes(aid) ? 'PASS' : 'FAIL', 'checks tenant identifiers only; endpoint must return tenant-scoped records with tenant identifiers');
          add('Tenant B response excludes Tenant A identifiers', bNoA && bv.includes(bid) ? 'PASS' : 'FAIL', 'checks tenant identifiers only; endpoint must return tenant-scoped records with tenant identifiers');
          if ([a,b].some(x=>x.status !== 200) || !aNoB || !bNoA || !av.includes(aid) || !bv.includes(bid)) process.exitCode = 1;
        } catch (e) { add('Live HTTP probe', 'FAIL', `${e.name}: request failed; details omitted to avoid leaking configuration`); process.exitCode = 1; }
        const out = path.join(root, 'PHASE161_TENANT_ISOLATION_REPORT.json'); fs.writeFileSync(out, JSON.stringify(report,null,2)+'\n'); console.log(`Report written: ${path.relative(root,out)}`);
      })();
    }
  }
}
if (missing.length || report.checks.some(x => x.status === 'BLOCKED')) {
  const out = path.join(root, 'PHASE161_TENANT_ISOLATION_REPORT.json'); fs.writeFileSync(out, JSON.stringify(report,null,2)+'\n'); console.log(`Report written: ${path.relative(root,out)}`);
}
