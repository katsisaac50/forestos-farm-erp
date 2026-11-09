#!/usr/bin/env node
'use strict';
// Phase 196: search trusted local project artifacts for an exact, aligned API lockfile.
// Default is read-only. Recovery requires --recover and an exact manifest identity match.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const manifestPath = path.join(api, 'package.json');
const targetPath = path.join(api, 'package-lock.json');
const recover = process.argv.includes('--recover');
const skipDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage']);
const maxFiles = 12000;
const maxBytes = 25 * 1024 * 1024;
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { __error: e.message }; } }
function walk(dir, out) {
  if (out.length >= maxFiles) return;
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (out.length >= maxFiles) break;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!skipDirs.has(ent.name)) walk(full, out); }
    else if (ent.isFile() && ['package-lock.json', 'npm-shrinkwrap.json'].includes(ent.name) && full !== targetPath) out.push(full);
  }
}
const report = { phase: 196, title: 'Local Lockfile Recovery', generatedAt: new Date().toISOString(), mode: recover ? 'explicit-recovery' : 'read-only-scan', manifest: { exists: fs.existsSync(manifestPath), valid: false, name: null, version: null, sha256: null }, target: { path: path.relative(root, targetPath), exists: fs.existsSync(targetPath), created: false }, scan: { candidatesChecked: 0, candidates: [], truncated: false }, recovery: { attempted: false, succeeded: false, source: null }, installExecuted: false, buildExecuted: false, productionCleared: false, nextActions: [] };
if (report.manifest.exists) {
  const pkg = readJson(manifestPath);
  report.manifest.valid = !pkg.__error && typeof pkg.name === 'string' && typeof pkg.version === 'string' && !!pkg.dependencies && !!pkg.devDependencies;
  if (report.manifest.valid) { report.manifest.name = pkg.name; report.manifest.version = pkg.version; report.manifest.sha256 = sha256(manifestPath); }
}
if (!report.manifest.valid) report.nextActions.push('Restore or repair apps/api/package.json from a trusted project source before attempting lockfile recovery.');
else if (report.target.exists) {
  const lock = readJson(targetPath);
  const aligned = !lock.__error && Number.isInteger(lock.lockfileVersion) && lock.packages?.['']?.name === report.manifest.name && lock.packages?.['']?.version === report.manifest.version;
  report.target.aligned = aligned;
  if (aligned) report.nextActions.push('An aligned lockfile already exists; review it, then run the Phase 194 clean-install/build gate.');
  else report.nextActions.push('The existing lockfile is invalid or misaligned; preserve it for review and recover only from a trusted exact-match source.');
} else if (report.manifest.valid) {
  const candidates = []; walk(root, candidates); report.scan.truncated = candidates.length >= maxFiles;
  for (const file of candidates) {
    if (report.scan.candidatesChecked >= maxFiles) { report.scan.truncated = true; break; }
    let stat; try { stat = fs.statSync(file); } catch { continue; }
    if (stat.size > maxBytes) continue;
    report.scan.candidatesChecked++;
    const lock = readJson(file);
    const aligned = !lock.__error && Number.isInteger(lock.lockfileVersion) && lock.packages?.['']?.name === report.manifest.name && lock.packages?.['']?.version === report.manifest.version;
    report.scan.candidates.push({ path: path.relative(root, file), validJson: !lock.__error, lockfileVersion: Number.isInteger(lock.lockfileVersion) ? lock.lockfileVersion : null, aligned, sha256: sha256(file), bytes: stat.size });
  }
  const match = report.scan.candidates.find(c => c.aligned);
  if (match) {
    report.nextActions.push(`Trusted local candidate found at ${match.path}; review provenance and checksum before any recovery.`);
    if (recover) {
      report.recovery.attempted = true;
      const source = path.resolve(root, match.path);
      if (fs.existsSync(targetPath)) throw new Error('Refusing to overwrite an existing target lockfile.');
      const data = fs.readFileSync(source);
      const lock = JSON.parse(data.toString('utf8'));
      if (lock.packages?.['']?.name !== report.manifest.name || lock.packages?.['']?.version !== report.manifest.version) throw new Error('Candidate alignment changed during recovery; refusing copy.');
      fs.writeFileSync(targetPath, data, { flag: 'wx' });
      report.target.created = true; report.target.exists = true; report.recovery.succeeded = true; report.recovery.source = match.path;
      report.nextActions.push('Review the recovered lockfile diff and provenance, then run npm ci --ignore-scripts --no-audit --no-fund and npm run build via the explicit Phase 194 gate.');
    }
  } else report.nextActions.push('No exact-match lockfile found in local project artifacts. Do not invent dependency resolutions; retry in a registry-enabled environment or obtain a lockfile from trusted version control/CI artifacts.');
}
report.nextActions.push('This phase does not run npm install, compile the API, test live services, or clear production.');
fs.writeFileSync(path.join(root, 'PHASE196_LOCAL_LOCKFILE_RECOVERY_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.manifest.valid || (recover && !report.recovery.succeeded && !report.target.aligned)) process.exitCode = 2;
