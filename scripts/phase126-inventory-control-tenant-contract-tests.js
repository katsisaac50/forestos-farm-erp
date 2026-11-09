#!/usr/bin/env node
'use strict';
// Dependency-free contract checks for Phase 126's static-only audit.
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'phase126-inventory-control-tenant-ownership-audit.js');
const reportPath = path.join(root, 'PHASE126_INVENTORY_CONTROL_TENANT_OWNERSHIP_AUDIT.json');
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({name, ok:true}); }
  catch (e) { checks.push({name, ok:false, error:e.message}); }
}
const result = spawnSync(process.execPath, [script], {cwd:root, encoding:'utf8'});
check('audit exits successfully', () => { if (result.status !== 0) throw new Error(result.stderr || result.stdout); });
check('report is generated', () => { if (!fs.existsSync(reportPath)) throw new Error('report missing'); });
let report = null;
try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch {}
check('report explicitly states static-only and no DB connection', () => {
  if (!report || report.mode !== 'static-source-only-read-only' || report.databaseConnectionAttempted !== false) throw new Error('unsafe/missing mode declaration');
});
check('report declares zero modified records', () => { if (!report || report.recordsModified !== 0) throw new Error('recordsModified must be 0'); });
check('migration remains unapproved', () => { if (!report || report.decisionGate?.migrationApproved !== false) throw new Error('migration must remain unapproved'); });
check('migration gates include ownership and backup review', () => {
  const gates = report?.decisionGate?.requiredBeforeMigration || [];
  if (!gates.some(x => /ownership/i.test(x)) || !gates.some(x => /backup/i.test(x))) throw new Error('required gates missing');
});
check('schema ownership is now tenant-aware', () => {
  const schema = fs.readFileSync(path.join(root, 'apps/api/src/inventory-control/inventory.schema.ts'), 'utf8');
  if (!/organizationId:\s*string/.test(schema) || !/StockItemSchema\.index\(\{organizationId:1,itemCode:1\}/.test(schema)) throw new Error('tenant ownership/index remediation missing');
});
check('stock item listing is organization-scoped', () => {
  const service = fs.readFileSync(path.join(root, 'apps/api/src/inventory-control/inventory-control.service.ts'), 'utf8');
  if (!/items\.find\(f\)/.test(service) || !/organizationFilter\(context\)/.test(service)) throw new Error('tenant-scoped item listing missing');
});
check('movement listing is organization-scoped', () => {
  const service = fs.readFileSync(path.join(root, 'apps/api/src/inventory-control/inventory-control.service.ts'), 'utf8');
  if (!/moves\.find\(filter\)/.test(service) || !/const filter:\s*any\s*=\s*organizationFilter\(context\)/.test(service)) throw new Error('tenant-scoped movement listing missing');
});
check('movement parent lookup is scoped to the verified organization', () => {
  const service = fs.readFileSync(path.join(root, 'apps/api/src/inventory-control/inventory-control.service.ts'), 'utf8');
  if (!/items\.findOne\(organizationFilter\(context,\s*\{\s*_id:\s*b\.itemId\s*\}\)\)/.test(service)) throw new Error('scoped parent lookup missing');
});
check('controller resolves organization context', () => {
  const controller = fs.readFileSync(path.join(root, 'apps/api/src/inventory-control/inventory-control.controller.ts'), 'utf8');
  if (!/organizationAccess\.resolveContext\(userId, organizationId\)/.test(controller)) throw new Error('verified organization context missing');
});
check('report contains source paths and limitations', () => {
  if (!report?.sources?.schema || !report?.limitations?.length) throw new Error('source/limitations missing');
});
check('audit script makes no database client connection', () => {
  const s = fs.readFileSync(script, 'utf8');
  if (/mongoose\.connect|MongoClient\(|\.connect\(/.test(s)) throw new Error('database connection pattern present');
});
check('audit script does not write to stock model data', () => {
  const s = fs.readFileSync(script, 'utf8');
  if (/\.updateMany\(|\.bulkWrite\(|\.save\(|\.create\(/.test(s)) throw new Error('mutating database pattern present');
});
check('inventory module source files exist', () => {
  for (const p of ['apps/api/src/inventory-control/inventory.schema.ts','apps/api/src/inventory-control/inventory-control.service.ts','apps/api/src/inventory-control/inventory-control.controller.ts']) {
    if (!fs.existsSync(path.join(root,p))) throw new Error(`missing ${p}`);
  }
});
const failed = checks.filter(c => !c.ok);
checks.forEach(c => console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.error ? ': '+c.error : ''}`));
console.log(`Phase 126 contract tests: ${checks.length-failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
