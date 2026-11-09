#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function parse(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`Cannot parse ${file}: ${e.message}`); } }
function same(a,b) { return JSON.stringify(Object.fromEntries(Object.entries(a||{}).sort(([x],[y])=>x.localeCompare(y))) ) === JSON.stringify(Object.fromEntries(Object.entries(b||{}).sort(([x],[y])=>x.localeCompare(y)))); }
function run(argv = process.argv.slice(2)) {
  const rootArg = argv.find((x,i)=>argv[i-1]==='--root');
  const root = path.resolve(rootArg || process.cwd());
  const generate = argv.includes('--generate');
  const reportArg = argv.find((x,i)=>argv[i-1]==='--report');
  const apiDir = path.join(root, 'apps', 'api');
  const manifestPath = path.join(apiDir, 'package.json');
  const lockPath = path.join(apiDir, 'package-lock.json');
  const reportPath = reportArg ? path.resolve(reportArg) : path.join(root, 'PHASE217_LOCKFILE_GENERATION_REPORT.json');
  const report = { phase: 217, tool: 'lockfile-generation-runner', generatedAt: new Date().toISOString(), root, generationRequested: generate, status: 'BLOCKED', checks: [], actions: [], evidence: {} };
  const check = (name, pass, detail) => report.checks.push({name, pass: !!pass, detail});
  try {
    if (!fs.existsSync(manifestPath)) throw new Error(`Missing API manifest: ${manifestPath}`);
    const manifest = parse(manifestPath);
    check('manifest_identity', !!manifest.name && !!manifest.version, `${manifest.name || '(missing name)'}@${manifest.version || '(missing version)'}`);
    check('build_script', !!(manifest.scripts && manifest.scripts.build), manifest.scripts && manifest.scripts.build || 'missing');
    if (generate) {
      const npm = spawnSync('npm', ['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund','--fetch-retries=0','--fetch-timeout=30000'], {cwd: apiDir, encoding:'utf8', timeout: 180000});
      report.evidence.npmExitCode = npm.status;
      report.evidence.npmSignal = npm.signal || null;
      report.evidence.npmOutputTail = String((npm.stdout||'')+'\n'+(npm.stderr||'')).slice(-5000);
      if (npm.error) report.evidence.npmError = npm.error.message;
      report.actions.push({action:'npm install --package-lock-only', exitCode:npm.status, signal:npm.signal||null});
      if (npm.status !== 0) throw new Error(`npm lockfile generation failed (${npm.status ?? npm.error?.message ?? 'unknown'}); see report output tail.`);
    } else {
      report.actions.push({action:'generation skipped', detail:'Pass --generate to run npm lockfile generation in apps/api.'});
    }
    if (!fs.existsSync(lockPath)) {
      check('lockfile_exists', false, 'apps/api/package-lock.json is absent');
      throw new Error(generate ? 'Lockfile generation did not create package-lock.json.' : 'Lockfile absent. Re-run with --generate in an environment with registry access.');
    }
    const lock = parse(lockPath);
    check('lockfile_exists', true, 'package-lock.json exists');
    check('lockfile_identity', lock.name === manifest.name && lock.version === manifest.version, `lock=${lock.name||'?'}@${lock.version||'?'}; manifest=${manifest.name}@${manifest.version}`);
    check('lockfile_version', Number.isInteger(lock.lockfileVersion) && lock.lockfileVersion >= 2, `lockfileVersion=${lock.lockfileVersion}`);
    const pkg = lock.packages && lock.packages[''];
    check('root_package_entry', !!pkg, 'packages[""] root entry');
    if (pkg) {
      check('root_dependency_alignment', same(pkg.dependencies, manifest.dependencies), 'dependencies map alignment');
      check('root_dev_dependency_alignment', same(pkg.devDependencies, manifest.devDependencies), 'devDependencies map alignment');
      check('root_optional_dependency_alignment', same(pkg.optionalDependencies, manifest.optionalDependencies), 'optionalDependencies map alignment');
    }
    report.evidence.manifestSha256 = sha256(manifestPath);
    report.evidence.lockfileSha256 = sha256(lockPath);
    report.evidence.nodeVersion = process.version;
    const npmV = spawnSync('npm',['--version'],{encoding:'utf8',timeout:10000});
    report.evidence.npmVersion = npmV.status === 0 ? npmV.stdout.trim() : null;
    const failures = report.checks.filter(c=>!c.pass);
    report.status = failures.length ? 'BLOCKED' : 'LOCKFILE_READY_NOT_BUILD_VERIFIED';
    if (!failures.length) report.actions.push({action:'next',detail:'Review and commit this lockfile, then run npm ci and npm run build in authoritative CI. This report does not establish build success.'});
  } catch (e) { report.error = e.message; report.status = 'BLOCKED'; }
  fs.mkdirSync(path.dirname(reportPath), {recursive:true});
  fs.writeFileSync(reportPath, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  return report.status === 'LOCKFILE_READY_NOT_BUILD_VERIFIED' ? 0 : 1;
}
if (require.main === module) process.exitCode = run();
module.exports = { run };
