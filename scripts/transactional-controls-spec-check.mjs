import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'docs/PHASE68_TRANSACTIONAL_FINANCIAL_CONTROLS.md',
  'apps/api/test/transactional-financial-controls.test-plan.md',
  'docs/PHASE67_AUTOMATED_FINANCIAL_RECONCILIATION_RECOVERY.md',
];
const missing = requiredFiles.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error(`Missing Phase 68 files: ${missing.join(', ')}`);
  process.exit(1);
}
const text = requiredFiles.map((p) => fs.readFileSync(path.join(root, p), 'utf8')).join('\n').toLowerCase();
const terms = ['idempotency', 'stale', 'second reviewer', 'rollback', 'read-only'];
const absent = terms.filter((term) => !text.includes(term));
if (absent.length) {
  console.error(`Missing required control concepts: ${absent.join(', ')}`);
  process.exit(1);
}
console.log('Phase 68 specification check passed.');
console.log('Documentation contract only: no MongoDB connection or financial writes were performed.');
