#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps/api');
const pkg = path.join(api, 'package.json');
if (!fs.existsSync(pkg)) { console.error('BLOCKED: apps/api/package.json is missing.'); process.exit(2); }
const lock = path.join(api, 'package-lock.json');
if (fs.existsSync(lock)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(lock, 'utf8'));
    if (parsed.lockfileVersion && parsed.packages) {
      console.log('API package-lock.json already exists and has npm lockfile structure.');
      console.log('Next: run npm ci --ignore-scripts --no-audit --no-fund, then npm run build.');
      process.exit(0);
    }
  } catch {}
  console.error('BLOCKED: existing package-lock.json is malformed or not a modern npm lockfile; inspect it before replacing.');
  process.exit(2);
}
console.log('Generating apps/api/package-lock.json from the declared manifest.');
console.log('This step requires registry access unless all metadata is cached.');
const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: api, stdio: 'inherit', timeout: Number(process.env.FORESTOS_LOCKFILE_TIMEOUT_MS || 180000),
  env: { ...process.env, npm_config_package_lock: 'true' }
});
if (result.error) {
  console.error(`BLOCKED: npm lockfile generation failed to start or timed out: ${result.error.message}`);
  process.exit(2);
}
if (result.status !== 0 || !fs.existsSync(lock)) {
  console.error('BLOCKED: no lockfile was generated. Check registry connectivity and npm errors, then rerun this command.');
  process.exit(typeof result.status === 'number' ? result.status || 2 : 2);
}
try {
  const parsed = JSON.parse(fs.readFileSync(lock, 'utf8'));
  if (!parsed.lockfileVersion || !parsed.packages) throw new Error('missing lockfileVersion/packages');
} catch (e) {
  console.error(`BLOCKED: generated lockfile failed validation: ${e.message}`);
  process.exit(2);
}
console.log('PASS: package-lock.json generated and structurally validated. Review and commit it.');
console.log('Next: run npm ci --ignore-scripts --no-audit --no-fund, then npm run build.');
