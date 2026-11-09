#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 113 — read-only MongoDB runtime preflight.
 * Connects only to a database whose name contains test or qa. Performs no writes.
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
try {
  mongoose = require('../apps/api/node_modules/mongoose');
} catch {
  console.error('DEPENDENCY ERROR: Install API dependencies first (cd apps/api && npm install).');
  process.exit(2);
}

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
    const db = mongoose.connection.db;
    const ping = await db.command({ ping: 1 });
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = new Set(collections.map(c => c.name));
    const expected = ['organizations', 'users', 'organizationmemberships'];
    console.log(`PASS connected to test database "${dbName}"`);
    console.log(`PASS MongoDB ping: ${ping.ok === 1 ? 'ok' : 'unexpected response'}`);
    let missing = 0;
    for (const name of expected) {
      if (names.has(name)) console.log(`PASS expected collection exists: ${name}`);
      else { missing++; console.error(`MISSING expected collection: ${name}`); }
    }
    if (missing) {
      console.error('Preflight incomplete: run the approved fixture seeder against this disposable test database, then retry.');
      process.exitCode = 1;
    } else {
      console.log('PASS required collections are present. This does not prove schema compatibility, authentication, or tenant isolation.');
    }
  } catch (error) {
    console.error(`PREFLIGHT FAILED: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
