import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/api/src/main.ts',
  'apps/api/test/closed-period-versioning.test-plan.md',
  'apps/api/test/spend-evidence-corrections.test-plan.md',
  'apps/api/test/capital-spend-concurrency.test-plan.md',
  'apps/api/test/monthly-financial-close.validation.test-plan.md',
  'docs/PHASE64_CLOSED_PERIOD_INTEGRITY_VERSIONING.md',
];
const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('Release smoke check failed. Missing files:');
  for (const p of missing) console.error(` - ${p}`);
  process.exit(1);
}

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const apiPkg = JSON.parse(read('apps/api/package.json'));
const webPkg = JSON.parse(read('apps/web/package.json'));
if (!apiPkg.scripts?.build || !webPkg.scripts?.build) {
  console.error('Release smoke check failed: build scripts are required in both apps.');
  process.exit(1);
}

const allSourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) allSourceFiles.push(full);
  }
}
walk(path.join(root, 'apps/api/src'));
const apiText = allSourceFiles.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
const checks = [
  ['monthly close versions route/service marker', /monthly-financial-close\/versions|MonthlyCloseVersion/.test(apiText)],
  ['capital spend correction/reversal marker', /correction-request|reversal/.test(apiText)],
  ['capital spend verification marker', /capital-spend-verification/.test(apiText)],
  ['global validation pipe marker', /ValidationPipe/.test(read('apps/api/src/main.ts'))],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Release smoke check failed:');
  for (const [name] of failed) console.error(` - ${name}`);
  process.exit(1);
}

console.log('Release smoke check passed.');
console.log(`Checked ${required.length} required files, both build scripts, and ${checks.length} source markers.`);
console.log('This is a source-contract check only; it does not replace builds, API tests, database tests, or security review.');
