#!/usr/bin/env node
'use strict';
// Static contract tests only; no MongoDB or HTTP calls.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = {
  schema: path.join(root, 'apps/api/src/inventory-control/inventory.schema.ts'),
  service: path.join(root, 'apps/api/src/inventory-control/inventory-control.service.ts'),
  controller: path.join(root, 'apps/api/src/inventory-control/inventory-control.controller.ts'),
  module: path.join(root, 'apps/api/src/inventory-control/inventory-control.module.ts'),
};
const src = {};
for (const [k,p] of Object.entries(files)) {
  if (!fs.existsSync(p)) { console.error(`FAIL source exists: ${k}`); process.exit(1); }
  src[k] = fs.readFileSync(p, 'utf8');
}
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({name,ok:true}); }
  catch(e) { checks.push({name,ok:false,error:e.message}); }
}
check('controller uses JWT guard', () => {
  if (!/@UseGuards\(JwtAuthGuard\)/.test(src.controller)) throw Error('JWT guard missing');
});
check('organization context is resolved from authenticated user and header', () => {
  if (!/organizationAccess\.resolveContext\(userId, organizationId\)/.test(src.controller) ||
      !/Headers\('x-organization-id'\)/.test(src.controller)) throw Error('verified org context pattern missing');
});
check('organizations module is imported for access service', () => {
  if (!/OrganizationsModule/.test(src.module)) throw Error('OrganizationsModule missing');
});
check('stock item schema includes organizationId', () => {
  if (!/class StockItem[\s\S]*?organizationId:\s*string/.test(src.schema)) throw Error('StockItem organizationId missing');
});
check('stock movement schema includes organizationId', () => {
  if (!/class StockMovement[\s\S]*?organizationId:\s*string/.test(src.schema)) throw Error('StockMovement organizationId missing');
});
check('item code uniqueness is organization-scoped', () => {
  if (!/StockItemSchema\.index\(\{organizationId:1,itemCode:1\},\{unique:true/.test(src.schema) ||
      /itemCode:\s*string;\s*\n\s*@Prop\(\{required:true,unique:true/.test(src.schema)) throw Error('tenant item index missing or global unique declaration remains');
});
check('movement code uniqueness is organization-scoped', () => {
  if (!/StockMovementSchema\.index\(\{organizationId:1,movementCode:1\},\{unique:true/.test(src.schema)) throw Error('tenant movement index missing');
});
check('dashboard reads and count are scoped', () => {
  if (!/this\.items\.find\(itemFilter\)/.test(src.service) ||
      !/this\.moves\.find\(movementFilter\)/.test(src.service) ||
      !/countDocuments\(movementFilter\)/.test(src.service)) throw Error('dashboard scope missing');
});
check('item listing always scopes organization', () => {
  if (!/const f:\s*any\s*=\s*organizationFilter\(context\)/.test(src.service)) throw Error('list scope missing');
});
check('item update scopes lookup by organization', () => {
  if (!/findOne\(organizationFilter\(context,\s*\{\s*_id:\s*id\s*\}\)\)/.test(src.service)) throw Error('item update scope missing');
});
check('movement parent is verified inside organization', () => {
  if (!/items\.findOne\(organizationFilter\(context,\s*\{\s*_id:\s*b\.itemId\s*\}\)\)/.test(src.service)) throw Error('movement parent scope missing');
});
check('movement list is organization-scoped even without itemId', () => {
  if (!/const filter:\s*any\s*=\s*organizationFilter\(context\)/.test(src.service) ||
      !/this\.moves\.find\(filter\)/.test(src.service)) throw Error('movement listing scope missing');
});
check('movement writes derive tenant ID from trusted context', () => {
  if (!/moves\.create\(organizationDocument\(context/.test(src.service)) throw Error('movement create helper missing');
});
check('user-provided organization ID is not trusted by service', () => {
  if (/organizationId\s*:\s*b\.organizationId/.test(src.service)) throw Error('untrusted body organizationId used');
});
check('contract tests make no database connections', () => {
  const all = Object.values(src).join('\n');
  if (/mongoose\.connect|MongoClient\(|\.connect\(/.test(all)) throw Error('connection code detected');
});
const failed = checks.filter(c => !c.ok);
checks.forEach(c => console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.error?': '+c.error:''}`));
console.log(`Phase 127 contract tests: ${checks.length-failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
