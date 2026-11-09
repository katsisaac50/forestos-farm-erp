#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 108 — deterministic test fixture seeder.
 * Requires `mongoose` and `bcryptjs` installed in apps/api.
 *
 * Required: FORESTOS_TEST_MONGODB_URI pointing to a dedicated test database.
 * Database name must contain "test" or "qa". The script only touches documents
 * with Phase 108 fixture slugs/emails and never drops a database.
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
  console.error('SAFETY ERROR: Database name must include "test" or "qa"; no data was changed.');
  process.exit(2);
}
const reset = process.argv.includes('--reset');
const mongoose = require('../apps/api/node_modules/mongoose');
const bcrypt = require('../apps/api/node_modules/bcryptjs');
const runTag = 'forestos-phase108';
const now = new Date();

function schema(definition, options = {}) {
  return new mongoose.Schema(definition, { timestamps: true, versionKey: false, ...options });
}
const Organization = mongoose.model('Organization', schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: 'active' },
  baseCurrency: { type: String, default: 'UGX' },
  timezone: { type: String, default: 'Africa/Kampala' },
  country: String,
  createdBy: { type: String, required: true },
  recordVersion: { type: Number, default: 1 },
}), 'organizations');
const User = mongoose.model('User', schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true },
  active: { type: Boolean, default: true },
}), 'users');
const Membership = mongoose.model('OrganizationMembership', schema({
  userId: { type: String, required: true },
  organizationId: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'active' },
  addedBy: { type: String, required: true },
}), 'organizationmemberships');
const Plantation = mongoose.model('Plantation', schema({
  blockId: { type: String, required: true },
  organizationId: { type: String, required: true },
  location: { type: String, required: true },
  areaAcres: { type: Number, required: true },
  cloneOrProvenance: String,
  plantingDate: Date,
  initialTrees: Number,
  latestLiveTrees: Number,
  createdBy: { type: String, required: true },
}), 'plantations');
const Hive = mongoose.model('Hive', schema({
  hiveId: { type: String, required: true },
  organizationId: { type: String, required: true },
  apiarySite: { type: String, required: true },
  colonyStatus: { type: String, default: 'Unknown' },
  honeyHarvestedKg: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
}), 'hives');

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const emails = [
    'phase108.owner.a@example.test',
    'phase108.owner.b@example.test',
    'phase108.suspended@example.test',
  ];
  const slugs = ['forestos-phase108-org-a', 'forestos-phase108-org-b'];
  if (reset) {
    const oldUsers = await User.find({ email: { $in: emails } }).select('_id').lean();
    const userIds = oldUsers.map(x => String(x._id));
    const oldOrgs = await Organization.find({ slug: { $in: slugs } }).select('_id').lean();
    const orgIds = oldOrgs.map(x => String(x._id));
    await Membership.deleteMany({ $or: [{ userId: { $in: userIds } }, { organizationId: { $in: orgIds } }] });
    await Plantation.deleteMany({ blockId: { $in: ['PH108-BLOCK-A', 'PH108-BLOCK-B'] } });
    await Hive.deleteMany({ hiveId: { $in: ['PH108-HIVE-A', 'PH108-HIVE-B'] } });
    await User.deleteMany({ email: { $in: emails } });
    await Organization.deleteMany({ slug: { $in: slugs } });
  }

  const password = process.env.FORESTOS_TEST_FIXTURE_PASSWORD || 'ForestOS-Test-Only-Password-108!';
  if (password.length < 12) throw new Error('FORESTOS_TEST_FIXTURE_PASSWORD must be at least 12 characters.');
  const passwordHash = await bcrypt.hash(password, 12);
  const userA = await User.findOneAndUpdate(
    { email: emails[0] }, { $set: { passwordHash, role: 'owner', active: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const userB = await User.findOneAndUpdate(
    { email: emails[1] }, { $set: { passwordHash, role: 'owner', active: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const suspendedUser = await User.findOneAndUpdate(
    { email: emails[2] }, { $set: { passwordHash, role: 'field_worker', active: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const orgA = await Organization.findOneAndUpdate(
    { slug: slugs[0] }, { $set: { name: 'Phase 108 Test Forest A', status: 'active', createdBy: String(userA._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const orgB = await Organization.findOneAndUpdate(
    { slug: slugs[1] }, { $set: { name: 'Phase 108 Test Apiary B', status: 'active', createdBy: String(userB._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await Membership.findOneAndUpdate(
    { userId: String(userA._id), organizationId: String(orgA._id) },
    { $set: { role: 'owner', status: 'active', addedBy: String(userA._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Membership.findOneAndUpdate(
    { userId: String(userB._id), organizationId: String(orgB._id) },
    { $set: { role: 'owner', status: 'active', addedBy: String(userB._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Membership.findOneAndUpdate(
    { userId: String(suspendedUser._id), organizationId: String(orgA._id) },
    { $set: { role: 'viewer', status: 'suspended', addedBy: String(userA._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const plantationA = await Plantation.findOneAndUpdate(
    { organizationId: String(orgA._id), blockId: 'PH108-BLOCK-A' },
    { $set: { location: 'Test Plot A', areaAcres: 1, cloneOrProvenance: 'Test provenance', plantingDate: now, initialTrees: 1000, latestLiveTrees: 980, createdBy: String(userA._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const plantationB = await Plantation.findOneAndUpdate(
    { organizationId: String(orgB._id), blockId: 'PH108-BLOCK-B' },
    { $set: { location: 'Test Plot B', areaAcres: 2, cloneOrProvenance: 'Test provenance', plantingDate: now, initialTrees: 2000, latestLiveTrees: 1950, createdBy: String(userB._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const hiveA = await Hive.findOneAndUpdate(
    { organizationId: String(orgA._id), hiveId: 'PH108-HIVE-A' },
    { $set: { apiarySite: 'Test Apiary A', colonyStatus: 'Occupied', honeyHarvestedKg: 2, createdBy: String(userA._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const hiveB = await Hive.findOneAndUpdate(
    { organizationId: String(orgB._id), hiveId: 'PH108-HIVE-B' },
    { $set: { apiarySite: 'Test Apiary B', colonyStatus: 'Occupied', honeyHarvestedKg: 3, createdBy: String(userB._id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const manifest = {
    phase: 108,
    database: dbName,
    warning: 'TEST FIXTURES ONLY. Do not use these accounts or this database in production.',
    credentials: {
      tenantA: { email: emails[0], passwordEnv: 'FORESTOS_TEST_FIXTURE_PASSWORD', organizationId: String(orgA._id) },
      tenantB: { email: emails[1], passwordEnv: 'FORESTOS_TEST_FIXTURE_PASSWORD', organizationId: String(orgB._id) },
      suspended: { email: emails[2], passwordEnv: 'FORESTOS_TEST_FIXTURE_PASSWORD', organizationId: String(orgA._id) },
    },
    records: {
      plantationA: String(plantationA._id),
      plantationB: String(plantationB._id),
      hiveA: String(hiveA._id),
      hiveB: String(hiveB._id),
    },
  };
  console.log(JSON.stringify(manifest, null, 2));
  await mongoose.disconnect();
})().catch(async error => {
  console.error(`SEED FAILED: ${error.message}`);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
