import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const specPath = 'docs/PHASE67_AUTOMATED_FINANCIAL_RECONCILIATION_RECOVERY.md';
const testPath = 'apps/api/test/automated-financial-reconciliation.test-plan.md';
for (const p of [specPath, testPath]) {
  if (!fs.existsSync(path.join(root, p))) {
    console.error(`Missing required Phase 67 file: ${p}`);
    process.exit(1);
  }
}
const content = [
  fs.readFileSync(path.join(root, specPath), 'utf8'),
  fs.readFileSync(path.join(root, testPath), 'utf8'),
].join('\n').toLowerCase();
const required = [
  'netspendugx',
  'countervarianceugx',
  'dry-run',
  'idempotent',
  'orphan reversal',
  'truncated',
  'second reviewer',
];
const missing = required.filter((term) => !content.includes(term));
if (missing.length) {
  console.error(`Missing reconciliation safeguards: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Phase 67 reconciliation specification check passed.');
console.log('This verifies documentation only; it does not connect to MongoDB or change records.');
