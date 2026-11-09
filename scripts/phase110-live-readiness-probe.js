#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 110 — live test-environment readiness probe.
 * This makes real HTTP requests but does not mutate application data.
 *
 * Required:
 *   FORESTOS_TEST_API_BASE_URL=http://127.0.0.1:4000/api
 *   FORESTOS_TEST_TENANT_A_EMAIL / FORESTOS_TEST_TENANT_A_PASSWORD
 *   FORESTOS_TEST_TENANT_B_EMAIL / FORESTOS_TEST_TENANT_B_PASSWORD
 *   FORESTOS_TEST_SUSPENDED_EMAIL / FORESTOS_TEST_SUSPENDED_PASSWORD
 *
 * Non-local targets are blocked unless explicitly opted in. Only use a dedicated
 * non-production environment. The script never prints passwords or JWTs.
 */
const baseUrl = (process.env.FORESTOS_TEST_API_BASE_URL || '').replace(/\/+$/, '');
const allowNonlocal = process.env.FORESTOS_ALLOW_NONLOCAL_TEST_TARGET === 'true';

function configError(message) {
  console.error(`CONFIG ERROR: ${message}`);
  process.exit(2);
}
function isLocal(url) {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return ['localhost', '127.0.0.1', '::1'].includes(host);
  } catch { return false; }
}
if (!baseUrl) configError('Set FORESTOS_TEST_API_BASE_URL to a dedicated test API base URL, including /api.');
if (!/^https?:\/\//i.test(baseUrl)) configError('API base URL must use http:// or https://.');
if (!isLocal(baseUrl) && !allowNonlocal) configError('Non-local target blocked. Set FORESTOS_ALLOW_NONLOCAL_TEST_TARGET=true only for a dedicated, secured non-production environment.');

const accounts = [
  { key: 'tenant A', email: process.env.FORESTOS_TEST_TENANT_A_EMAIL, password: process.env.FORESTOS_TEST_TENANT_A_PASSWORD },
  { key: 'tenant B', email: process.env.FORESTOS_TEST_TENANT_B_EMAIL, password: process.env.FORESTOS_TEST_TENANT_B_PASSWORD },
  { key: 'suspended-membership user', email: process.env.FORESTOS_TEST_SUSPENDED_EMAIL, password: process.env.FORESTOS_TEST_SUSPENDED_PASSWORD },
];
for (const account of accounts) {
  if (!account.email || !account.password) configError(`Missing credentials for ${account.key}. Set the corresponding FORESTOS_TEST_*_EMAIL and FORESTOS_TEST_*_PASSWORD variables.`);
}
if (new Set(accounts.map(a => a.email.trim().toLowerCase())).size !== accounts.length) {
  configError('Tenant A, tenant B, and suspended-membership test accounts must have distinct emails.');
}
const endpoint = (suffix) => `${baseUrl}/${suffix.replace(/^\/+/, '')}`;

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { rawText: raw.slice(0, 300) }; }
  return { response, body };
}
(async () => {
  let passed = 0;
  let failed = 0;
  const log = (ok, label, detail = '') => {
    if (ok) { passed++; console.log(`PASS ${label}${detail ? ` — ${detail}` : ''}`); }
    else { failed++; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
  };

  try {
    const { response, body } = await request(endpoint('health'));
    log(response.ok && body.status === 'ok' && body.service === 'forestos-api',
      'API liveness endpoint responds', `HTTP ${response.status}`);
    if (!response.ok || body.status !== 'ok') {
      console.error('STOP: API liveness failed; login probes were not attempted.');
      process.exitCode = 1;
      return;
    }
  } catch (e) {
    console.error(`FAIL API liveness request — ${e.message}`);
    console.error('STOP: confirm the API is running and the base URL includes the correct /api prefix.');
    process.exitCode = 1;
    return;
  }

  try {
    const { response, body } = await request(endpoint('health/ready'));
    const database = body && body.checks ? body.checks.database : 'missing';
    log(response.ok && body.status === 'ready', 'API process readiness endpoint responds',
      `HTTP ${response.status}; database check=${database}`);
    if (database === 'not_checked') {
      console.log('NOTE Database connectivity is not verified by the current health endpoint.');
    }
  } catch (e) {
    log(false, 'API process readiness endpoint responds', e.message);
  }

  const identities = [];
  for (const account of accounts) {
    try {
      const login = await request(endpoint('auth/login'), {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: account.password }),
      });
      const token = login.body && login.body.accessToken;
      const loginOk = login.response.ok && typeof token === 'string' && token.length > 20 &&
        login.body.user && String(login.body.user.email).toLowerCase() === account.email.trim().toLowerCase();
      log(loginOk, `${account.key} can authenticate`, `HTTP ${login.response.status}`);
      if (!loginOk) {
        identities.push(null);
        continue;
      }

      const me = await request(endpoint('auth/me'), {
        headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      });
      const expectedId = String(login.body.user.id || '');
      const meOk = me.response.ok && me.body && String(me.body.id || '') === expectedId &&
        String(me.body.email || '').toLowerCase() === account.email.trim().toLowerCase();
      log(meOk, `${account.key} bearer token works at /auth/me`, `HTTP ${me.response.status}`);
      identities.push(meOk ? { id: expectedId, email: String(me.body.email).toLowerCase() } : null);
    } catch (e) {
      log(false, `${account.key} login / identity probe`, e.message);
      identities.push(null);
    }
  }

  if (identities.every(Boolean)) {
    log(new Set(identities.map(x => x.id)).size === identities.length,
      'three fixture accounts resolve to distinct user IDs');
  } else {
    log(false, 'three fixture accounts resolve to distinct user IDs', 'one or more identity probes failed');
  }

  console.log(`\nPhase 110 live readiness probe: ${passed} passed, ${failed} failed.`);
  console.log('Scope: live HTTP liveness, login, and bearer identity only. This does not prove database readiness or tenant isolation.');
  if (failed) process.exitCode = 1;
})().catch(error => {
  console.error(`UNEXPECTED ERROR: ${error.message}`);
  process.exitCode = 1;
});
