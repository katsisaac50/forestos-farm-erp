#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 114 — read-only fixture integrity audit.
 * Checks seeded Phase 108 records using MongoDB collections directly.
 * Does not authenticate against the API or prove tenant isolation.
 */
const uri = process.env.FORESTOS_TEST_MONGODB_URI;
if (!uri) {
  console.error('CONFIG ERROR: Set FORESTOS_TEST_MONGODB_URI to a dedicated test database.');
  process.exit(2);
}
let parsed;
try { parsed = new URL(uri); } catch {
  console.error('CONFIG ERROR: FORESTOS_TEST_MONGODB_URI is not a valid MongoDB URL.');
  process.exit(2);
}
const dbName = (parsed.pathname || '').replace(/^\/+/, '').split('?')[0];
if (!dbName || !/(test|qa)/i.test(dbName)) {
  console.error('SAFETY ERROR: Database name must include "test" or "qa"; no connection attempted.');
  process.exit(2);
}
let mongoose;
try { mongoose = require('../apps/api/node_modules/mongoose'); }
catch {
  console.error('DEPENDENCY ERROR: Install API dependencies first (cd apps/api && npm install).');
  process.exit(2);
}

const emails = [
  'phase108.owner.a@example.test',
  'phase108.owner.b@example.test',
  'phase108.suspended@example.test',
];
const slugs = ['forestos-phase108-org-a', 'forestos-phase108-org-b'];

(async () => {
  let failed = 0;
  function check(label, condition) {
    if (condition) console.log(`PASS ${label}`);
    else { failed++; console.error(`FAIL ${label}`); }
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
    const db = mongoose.connection.db;
    const [orgs, users] = await Promise.all([
      db.collection('organizations').find({ slug: { $in: slugs } }).toArray(),
      db.collection('users').find({ email: { $in: emails } }).toArray(),
    ]);

    // Membership references are strings; query after reading only the known fixture users.
    const userIds = users.map(u => String(u._id));
    const orgIds = orgs.map(o => String(o._id));
    const fixtureMemberships = await db.collection('organizationmemberships').find({
      userId: { $in: userIds },
      organizationId: { $in: orgIds },
    }).toArray();

    check('both Phase 108 organizations exist', slugs.every(s => orgs.some(o => o.slug === s)));
    check('both fixture owner accounts exist', emails.slice(0, 2).every(e => users.some(u => u.email === e)));
    check('suspended fixture account exists', users.some(u => u.email === emails[2]));
    check('fixture users have password hashes without printing them', users.length === 3 && users.every(u => typeof u.passwordHash === 'string' && u.passwordHash.length > 20));
    check('organizations are active', orgs.length === 2 && orgs.every(o => o.status === 'active'));
    check('fixture users are active', users.length === 3 && users.every(u => u.active === true));
    check('membership records exist for fixture accounts', fixtureMemberships.length >= 3);
    check('membership reference fields are stored as strings', fixtureMemberships.length >= 3 && fixtureMemberships.every(m => typeof m.userId === 'string' && typeof m.organizationId === 'string'));
    check('at least one active membership exists', fixtureMemberships.some(m => m.status === 'active'));
    check('suspended membership fixture exists', fixtureMemberships.some(m => m.status === 'suspended'));
    check('memberships refer only to known fixture users and organizations',
      fixtureMemberships.every(m => userIds.includes(String(m.userId)) && orgIds.includes(String(m.organizationId))));

    console.log(`\nPhase 114 fixture integrity audit: ${10 - failed}/10 passed.`);
    console.log('Scope: read-only database fixture checks. This does not test API login or authorization.');
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(`AUDIT FAILED: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
