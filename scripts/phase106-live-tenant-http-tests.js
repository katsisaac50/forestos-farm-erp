#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 106 — configurable live HTTP tenant-isolation harness.
 *
 * Requires a running test API and test-only credentials. No production target
 * is accepted unless FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true is explicitly set.
 *
 * Required environment:
 *   FORESTOS_TEST_API_BASE_URL=http://127.0.0.1:4000/api
 *   FORESTOS_TENANT_A_TOKEN=...
 *   FORESTOS_TENANT_B_TOKEN=...
 *   FORESTOS_SUSPENDED_TOKEN=... (optional)
 *   FORESTOS_TENANT_A_ORG_ID=...
 *   FORESTOS_TENANT_B_ORG_ID=...
 *   FORESTOS_TEST_SCENARIOS=/path/to/scenarios.json (optional)
 *
 * Scenario contract:
 * { "name": "...", "method": "GET|POST|PATCH|PUT|DELETE",
 *   "path": "/resource/id", "tenant": "A|B|SUSPENDED",
 *   "organizationHeader": "org-id", "body": {}, "expectedStatus": [200],
 *   "expectBodyNotToContain": ["secret phrase"] }
 *
 * This generic runner does not assume ForestOS route paths. Supply routes and
 * fixture IDs that exist in the isolated test deployment.
 */
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = (process.env.FORESTOS_TEST_API_BASE_URL || '').replace(/\/+$/, '');
const allowNonlocal = process.env.FORESTOS_ALLOW_NONLOCAL_TEST_TARGET === 'true';

function fail(message) {
  console.error(`CONFIG ERROR: ${message}`);
  process.exit(2);
}
function isLocal(url) {
  try {
    const host = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  } catch {
    return false;
  }
}
if (!baseUrl) fail('Set FORESTOS_TEST_API_BASE_URL to a dedicated test API URL.');
if (!/^https?:\/\//i.test(baseUrl)) fail('Base URL must use http:// or https://.');
if (!isLocal(baseUrl) && !allowNonlocal) {
  fail('Non-local API target blocked. Use a local test service, or explicitly set FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true for a secured non-production environment.');
}

const tokens = {
  A: process.env.FORESTOS_TENANT_A_TOKEN,
  B: process.env.FORESTOS_TENANT_B_TOKEN,
  SUSPENDED: process.env.FORESTOS_SUSPENDED_TOKEN,
};
const orgIds = {
  A: process.env.FORESTOS_TENANT_A_ORG_ID,
  B: process.env.FORESTOS_TENANT_B_ORG_ID,
};
const defaultScenarios = path.join(__dirname, '..', 'apps', 'api', 'test', 'phase106-live-tenant-scenarios.example.json');
const scenariosPath = process.env.FORESTOS_TEST_SCENARIOS || defaultScenarios;
if (!fs.existsSync(scenariosPath)) fail(`Scenario file not found: ${scenariosPath}`);
let scenarios;
try {
  scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
} catch (e) {
  fail(`Scenario file is not valid JSON: ${e.message}`);
}
if (!Array.isArray(scenarios) || scenarios.length === 0) fail('Scenario file must be a non-empty JSON array.');

function expand(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('${ORG_A}', orgIds.A || '')
      .replaceAll('${ORG_B}', orgIds.B || '');
  }
  if (Array.isArray(value)) return value.map(expand);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v)]));
  }
  return value;
}

(async () => {
  let passed = 0;
  let failed = 0;
  for (const [index, raw] of scenarios.entries()) {
    const s = expand(raw);
    const label = s.name || `scenario-${index + 1}`;
    try {
      if (!s.method || !s.path || !s.tenant || !Array.isArray(s.expectedStatus)) {
        throw new Error('Scenario requires method, path, tenant, expectedStatus[].');
      }
      const method = String(s.method).toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }
      const token = tokens[s.tenant];
      if (!token) throw new Error(`Missing token env for tenant ${s.tenant}.`);
      if (s.tenant !== 'SUSPENDED' && !orgIds[s.tenant]) {
        throw new Error(`Missing organization ID env for tenant ${s.tenant}.`);
      }
      const relativePath = String(s.path).replace(/^\/+/, '');
      const url = new URL(`${baseUrl}/${relativePath}`);
      const headers = { accept: 'application/json', authorization: `Bearer ${token}` };
      if (s.organizationHeader !== false) {
        headers['x-organization-id'] = s.organizationHeader || orgIds[s.tenant] || '';
      }
      let body;
      if (s.body !== undefined) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(s.body);
      }
      const response = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(15000) });
      const text = await response.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      const allowed = s.expectedStatus.includes(response.status);
      if (!allowed) throw new Error(`Expected status ${s.expectedStatus.join('/')} but got ${response.status}; body=${String(text).slice(0, 500)}`);
      const serialized = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      for (const secret of (s.expectBodyNotToContain || [])) {
        if (serialized.includes(secret)) throw new Error(`Response leaked forbidden marker: ${secret}`);
      }
      console.log(`PASS ${label} — HTTP ${response.status}`);
      passed++;
    } catch (error) {
      console.error(`FAIL ${label} — ${error.message}`);
      failed++;
    }
  }
  console.log(`\nPhase 106 live HTTP scenarios: ${passed}/${scenarios.length} passed; ${failed} failed.`);
  console.log('Note: only scenarios configured in the supplied file were exercised; this does not establish complete tenant isolation.');
  if (failed) process.exitCode = 1;
})();
