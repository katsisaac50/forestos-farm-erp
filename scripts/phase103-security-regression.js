#!/usr/bin/env node
/**
 * Phase 103 security regression orchestrator.
 * Runs existing static checks and validates that the API inventory is generated.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}
run('Tenant-isolation source smoke check', ['node', 'scripts/tenant-isolation-smoke-check.js']);
run('API route inventory generation', ['node', 'scripts/api-route-inventory.js']);
const reportPath = path.join(root, 'docs/PHASE102_API_ROUTE_INVENTORY.json');
if (!fs.existsSync(reportPath)) {
  console.error('Inventory JSON missing after generation.');
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const summary = report.summary || {};
if (!Number.isInteger(summary.controllerFilesScanned) || summary.controllerFilesScanned < 1) {
  console.error('Inventory contains no controller files.');
  process.exit(1);
}
if (!Number.isInteger(summary.routeDecoratorsFound) || summary.routeDecoratorsFound < 1) {
  console.error('Inventory contains no route decorators.');
  process.exit(1);
}
if (!Array.isArray(report.routes) || report.routes.length !== summary.routeDecoratorsFound) {
  console.error('Inventory route list does not match its summary count.');
  process.exit(1);
}
console.log('\n=== Inventory contract ===');
console.log(`PASS  ${summary.controllerFilesScanned} controller files and ${summary.routeDecoratorsFound} route decorators indexed.`);
console.log('NOTE  Review signals are not vulnerabilities; runtime authorization and tenant-isolation tests remain required.');
console.log('\nPhase 103 static security regression checks passed.');
