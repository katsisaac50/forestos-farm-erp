#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 115 — live authentication and organization-membership probe.
 * Read-only HTTP checks against a dedicated non-production API.
 *
 * Required:
 *   FORESTOS_TEST_API_BASE_URL=http://127.0.0.1:4000/api
 *   FORESTOS_TEST_TENANT_A_EMAIL / FORESTOS_TEST_TENANT_A_PASSWORD
 *   FORESTOS_TEST_TENANT_B_EMAIL / FORESTOS_TEST_TENANT_B_PASSWORD
 *   FORESTOS_TEST_SUSPENDED_EMAIL / FORESTOS_TEST_SUSPENDED_PASSWORD
 *   FORESTOS_TENANT_A_ORG_ID / FORESTOS_TENANT_B_ORG_ID
 *
 * Optional:
 *   FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true (dedicated secured non-production only)
 *
 * This probes implemented endpoints only: POST /auth/login, GET /auth/me,
 * GET /organization-access/mine, and GET /organization-access/context.
 * It does not prove that every domain route enforces tenant context.
 */
const baseUrl = (process.env.FORESTOS_TEST_API_BASE_URL || '').replace(/\/+$/, '');
const allowNonlocal = process.env.FORESTOS_ALLOW_NONLOCAL_TEST_TARGET === 'true';

function configError(message) {
  console.error(`CONFIG ERROR: ${message}`);
  process.exit(2);
}
function isLocal(value) {
  try {
    const host = new URL(value).hostname.replace(/^\[|\]$/g, '');
    return ['localhost', '127.0.0.1', '::1'].includes(host);
  } catch { return false; }
}
if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) configError('Set FORESTOS_TEST_API_BASE_URL to an http(s) test API URL including /api.');
if (!isLocal(baseUrl) && !allowNonlocal) configError('Non-local target blocked; explicitly opt in only for a secured non-production API.');
const accounts = [
  { key: 'A', label: 'Tenant A', email: process.env.FORESTOS_TEST_TENANT_A_EMAIL, password: process.env.FORESTOS_TEST_TENANT_A_PASSWORD },
  { key: 'B', label: 'Tenant B', email: process.env.FORESTOS_TEST_TENANT_B_EMAIL, password: process.env.FORESTOS_TEST_TENANT_B_PASSWORD },
  { key: 'SUSPENDED', label: 'Suspended-membership account', email: process.env.FORESTOS_TEST_SUSPENDED_EMAIL, password: process.env.FORESTOS_TEST_SUSPENDED_PASSWORD },
];
for (const a of accounts) if (!a.email || !a.password) configError(`Missing ${a.label} credentials in FORESTOS_TEST_* variables.`);
if (new Set(accounts.map(a => a.email.trim().toLowerCase())).size !== accounts.length) configError('All three test accounts must have distinct email addresses.');
const orgA = process.env.FORESTOS_TENANT_A_ORG_ID;
const orgB = process.env.FORESTOS_TENANT_B_ORG_ID;
if (!orgA || !orgB || orgA === orgB) configError('Set distinct FORESTOS_TENANT_A_ORG_ID and FORESTOS_TENANT_B_ORG_ID values.');

const endpoint = suffix => `${baseUrl}/${suffix.replace(/^\/+/, '')}`;
async function request(suffix, options = {}) {
  const response = await fetch(endpoint(suffix), { ...options, signal: AbortSignal.timeout(10000) });
  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { rawText: raw.slice(0, 200) }; }
  return { status: response.status, ok: response.ok, body };
}
function bearer(token) { return { accept: 'application/json', authorization: `Bearer ${token}` }; }
(async () => {
  let passed = 0, failed = 0;
  const log = (ok, label, detail = '') => {
    if (ok) { passed++; console.log(`PASS ${label}${detail ? ` — ${detail}` : ''}`); }
    else { failed++; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
  };
  const identities = {};
  for (const a of accounts) {
    try {
      const login = await request('auth/login', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ email: a.email, password: a.password }),
      });
      const token = login.body && login.body.accessToken;
      const loginOk = login.ok && typeof token === 'string' && token.length > 20 &&
        login.body.user && String(login.body.user.email || '').toLowerCase() === a.email.trim().toLowerCase();
      log(loginOk, `${a.label} login succeeds`, `HTTP ${login.status}`);
      if (!loginOk) continue;
      const me = await request('auth/me', { headers: bearer(token) });
      const meOk = me.ok && String(me.body.id || '') === String(login.body.user.id || '') &&
        String(me.body.email || '').toLowerCase() === a.email.trim().toLowerCase();
      log(meOk, `${a.label} bearer identity matches login`, `HTTP ${me.status}`);
      if (!meOk) continue;
      identities[a.key] = { token, id: String(me.body.id), email: String(me.body.email).toLowerCase() };
      const mine = await request('organization-access/mine', { headers: bearer(token) });
      const orgs = mine.body && Array.isArray(mine.body.organizations) ? mine.body.organizations : null;
      log(mine.ok && Array.isArray(orgs), `${a.label} organization list responds`, `HTTP ${mine.status}`);
      if (!mine.ok || !Array.isArray(orgs)) continue;
      identities[a.key].organizations = orgs;
      if (a.key === 'A') {
        log(orgs.some(o => String(o.organizationId) === orgA), 'Tenant A lists its own organization');
        log(!orgs.some(o => String(o.organizationId) === orgB), 'Tenant A does not list Tenant B organization');
      } else if (a.key === 'B') {
        log(orgs.some(o => String(o.organizationId) === orgB), 'Tenant B lists its own organization');
        log(!orgs.some(o => String(o.organizationId) === orgA), 'Tenant B does not list Tenant A organization');
      } else {
        log(!orgs.some(o => String(o.organizationId) === orgA || String(o.organizationId) === orgB),
          'Suspended-membership account lists neither test organization');
      }
    } catch (e) {
      log(false, `${a.label} auth/membership requests complete`, e.message);
    }
  }
  if (identities.A && identities.B && identities.SUSPENDED) {
    log(new Set([identities.A.id, identities.B.id, identities.SUSPENDED.id]).size === 3,
      'three accounts resolve to distinct user IDs');
    for (const [label, key, targetOrg] of [
      ['Tenant A resolves own organization context', 'A', orgA],
      ['Tenant A is denied Tenant B context', 'A', orgB],
      ['Tenant B resolves own organization context', 'B', orgB],
      ['Tenant B is denied Tenant A context', 'B', orgA],
      ['Suspended-membership account is denied Tenant A context', 'SUSPENDED', orgA],
    ]) {
      try {
        const r = await request('organization-access/context', {
          headers: { ...bearer(identities[key].token), 'x-organization-id': targetOrg },
        });
        const shouldAllow = label.includes('resolves own');
        const expected = shouldAllow ? r.ok && r.body.context &&
          String(r.body.context.organizationId) === targetOrg &&
          String(r.body.context.userId) === identities[key].id
          : [403, 404].includes(r.status);
        log(expected, label, `HTTP ${r.status}`);
      } catch (e) { log(false, label, e.message); }
    }
  } else {
    log(false, 'context authorization matrix', 'skipped because one or more account identity probes failed');
  }
  console.log(`\nPhase 115 live auth/membership probe: ${passed} passed, ${failed} failed.`);
  console.log('Scope: implemented authentication and organization-access endpoints only; domain-route tenant enforcement requires separate route-specific tests.');
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(`UNEXPECTED ERROR: ${e.message}`); process.exitCode = 1; });
