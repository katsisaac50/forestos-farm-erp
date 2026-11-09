/**
 * Phase 88 controlled migration for legacy plantation records.
 *
 * Usage:
 *   MONGODB_URI="..." LEGACY_ORGANIZATION_ID="<active org ObjectId>" node apps/api/scripts/migrate-legacy-plantations-to-organization.js
 *
 * This assigns only records missing organizationId. Run only when all existing
 * legacy plantation records belong to the selected organization. Back up the
 * database first and verify the target organization and counts.
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
  const organizations = db.collection('organizations');
  const plantations = db.collection('plantations');

  const organization = await organizations.findOne({
    _id: new mongoose.Types.ObjectId(organizationId),
    status: 'active',
  });
  if (!organization) throw new Error('Target organization was not found or is not active');

  const before = await plantations.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }, { organizationId: '' }],
  });
  console.log(`Target organization: ${organization.name} (${organization._id})`);
  console.log(`Legacy unscoped plantation records: ${before}`);
  console.log('IMPORTANT: this migration is safe only if all listed records belong to this one organization.');
  if (process.env.CONFIRM_LEGACY_PLANTATION_MIGRATION !== 'YES') {
    console.log('Dry run only. Set CONFIRM_LEGACY_PLANTATION_MIGRATION=YES after backup and review to apply.');
    return;
  }

  const result = await plantations.updateMany(
    { $or: [{ organizationId: { $exists: false } }, { organizationId: null }, { organizationId: '' }] },
    { $set: { organizationId: String(organization._id), createdBy: 'legacy-migration' } },
  );
  console.log(`Matched: ${result.matchedCount}; modified: ${result.modifiedCount}`);
  const remaining = await plantations.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }, { organizationId: '' }],
  });
  console.log(`Remaining unscoped records: ${remaining}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
