// apps/api/scripts/seed-org2.js
// Creates a second organization + its owner, for multitenancy testing.
// Same field shapes as bootstrap-production.js.
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.startsWith('mongodb')) {
    console.error('ERROR: set MONGODB_URI');
    process.exit(1);
  }

  const email    = process.env.ORG2_EMAIL    || 'katsisaac50@gmail.com';
  const password = process.env.ORG2_PASSWORD || 'love1234k-strong';
  const slug     = process.env.ORG2_SLUG     || 'kawanda-coffee-estate';
  const name     = process.env.ORG2_NAME     || 'Kawanda Coffee Estate';

  if (password.length < 12) {
    console.error('ERROR: password must be >=12 chars');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log('Connected to DB:', db.databaseName);

  const users       = db.collection('users');
  const orgs        = db.collection('organizations');
  const memberships = db.collection('organizationmemberships');
  const now         = new Date();

  // Org
  let org = await orgs.findOne({ slug });
  if (!org) {
    const r = await orgs.insertOne({
      slug, name,
      status: 'active',
      baseCurrency: 'UGX',
      timezone: 'Africa/Kampala',
      country: 'Uganda',
      createdBy: 'seed-org2',
      recordVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
    org = await orgs.findOne({ _id: r.insertedId });
    console.log('✓ ORG created:', slug, '→', org._id.toString());
  } else {
    console.log('• ORG exists:', slug, '→', org._id.toString());
  }
  const orgId = org._id.toString();

  // Owner user
  let user = await users.findOne({ email });
  if (!user) {
    const r = await users.insertOne({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'owner',
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    user = await users.findOne({ _id: r.insertedId });
    console.log('✓ USER created:', email, '→', user._id.toString());
  } else {
    console.log('• USER exists:', email, '→', user._id.toString());
  }
  const userId = user._id.toString();

  // Membership (strings, matching schema @Prop({type:String}))
  const existing = await memberships.findOne({ userId, organizationId: orgId });
  if (!existing) {
    await memberships.insertOne({
      userId,
      organizationId: orgId,
      role: 'owner',
      status: 'active',
      addedBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    console.log('✓ MEMBERSHIP granted:', email, '→', slug);
  } else {
    console.log('• MEMBERSHIP exists');
  }

  // Set org.createdBy now that user exists
  await orgs.updateOne({ _id: org._id }, { $set: { createdBy: userId, updatedAt: now } });

  console.log('\n--- SUMMARY ---');
  console.log('Org2 slug:', slug);
  console.log('Org2 name:', name);
  console.log('Org2 id  :', orgId);
  console.log('Owner2 email:', email);
  console.log('Owner2 password:', password);
  console.log('Owner2 id:', userId);
  console.log('\nUse these to log in as a second tenant.');

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });