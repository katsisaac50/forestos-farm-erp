import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'docs/PHASE66_FINANCIAL_TRANSACTION_INTEGRITY.md',
  'apps/api/test/financial-transaction-integrity.test-plan.md',
  'docs/PHASE65_RELEASE_READINESS.md',
  'scripts/release-smoke-check.mjs',
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Financial integrity readiness check failed:');
  for (const file of missing) console.error(` - missing ${file}`);
  process.exit(1);
}
const spec = fs.readFileSync(path.join(root, required[0]), 'utf8');
const plan = fs.readFileSync(path.join(root, required[1]), 'utf8');
const requiredTerms = ['Net spend', 'idempotent', 'MongoDB transaction', 'dry-run'];
const absent = requiredTerms.filter((term) => !`${spec}\n${plan}`.toLowerCase().includes(term.toLowerCase()));
if (absent.length) {
  console.error(`Financial integrity readiness check failed: missing concepts: ${absent.join(', ')}`);
  process.exit(1);
}
console.log('Financial integrity readiness check passed.');
console.log('Documentation/test-plan presence only; no database records were read or changed.');
