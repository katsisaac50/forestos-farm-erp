/**
 * Controlled migration for legacy hive records.
 * Dry run by default. Back up the database and verify every unscoped hive
 * belongs to the selected active organization before applying.
 *
 * Required env:
 * MONGODB_URI
 * LEGACY_ORGANIZATION_ID=<24-char ObjectId>
 * CONFIRM_LEGACY_HIVE_MIGRATION=YES to apply (otherwise dry run)
 */
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  const organizationId = process.env.LEGACY_ORGANIZATION_ID;
  if (!uri || !organizationId || !/^[a-f\d]{24}$/i.test(organizationId)) {
    throw new Error('Set MONGODB_URI and a valid LEGACY_ORGANIZATION_ID ObjectId');
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const orgs = db.collection('organizations');
  const hives = db.collection('hives');
  const org = await orgs.findOne({
    _id: new mongoose.Types.ObjectId(organizationId),
    status: 'active',
  });
  if (!org) throw new Error('Target organization not found or inactive');

  const unscoped = {
    $or: [
      { organizationId: { $exists: false } },
      { organizationId: null },
      { organizationId: '' },
    ],
  };
  const count = await hives.countDocuments(unscoped);
  console.log(`Target organization: ${org.name} (${org._id})`);
  console.log(`Unscoped legacy hive records: ${count}`);
  console.log('Dry run only unless CONFIRM_LEGACY_HIVE_MIGRATION=YES.');
  if (process.env.CONFIRM_LEGACY_HIVE_MIGRATION !== 'YES') return;

  const result = await hives.updateMany(unscoped, {
    $set: {
      organizationId: String(org._id),
      createdBy: 'legacy-migration',
    },
  });
  console.log(`Matched ${result.matchedCount}; modified ${result.modifiedCount}`);
  console.log(`Remaining unscoped: ${await hives.countDocuments(unscoped)}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
