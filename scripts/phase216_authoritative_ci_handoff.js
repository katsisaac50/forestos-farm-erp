'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function inspect(root) {
  root = path.resolve(root || process.cwd());
  const api = path.join(root, 'apps', 'api');
  const manifestPath = path.join(api, 'package.json');
  const lockPath = path.join(api, 'package-lock.json');
  const workflowPath = path.join(root, '.github', 'workflows', 'forestos-api-verified-build.yml');
  const checks = [];
  const add = (id, status, detail) => checks.push({ id, status, detail });
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); add('api_manifest', 'pass', `${manifest.name || 'unnamed'}@${manifest.version || 'unknown'}`); }
    catch (e) { add('api_manifest', 'blocked', `Invalid JSON: ${e.message}`); }
  } else add('api_manifest', 'blocked', 'apps/api/package.json is missing');
  if (manifest && manifest.scripts && manifest.scripts.build) add('api_build_script', 'pass', `build script: ${manifest.scripts.build}`);
  else add('api_build_script', 'blocked', 'API manifest does not declare a build script');
  let lock = null;
  if (fs.existsSync(lockPath)) {
    try {
      lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      const rootPackage = lock.packages && lock.packages[''];
      const same = manifest && rootPackage && lock.name === manifest.name && lock.version === manifest.version && rootPackage.name === manifest.name && rootPackage.version === manifest.version;
      add('lockfile_identity', same ? 'pass' : 'blocked', same ? 'Lockfile package identity matches API manifest' : 'Lockfile identity/version mismatch or missing packages[""]');
      if (same) {
        const maps = ['dependencies', 'devDependencies', 'optionalDependencies'];
        const mismatch = maps.filter(k => JSON.stringify(Object.entries(manifest[k] || {}).sort(([a],[b]) => a.localeCompare(b))) !== JSON.stringify(Object.entries(rootPackage[k] || {}).sort(([a],[b]) => a.localeCompare(b))));
        add('lockfile_dependency_alignment', mismatch.length ? 'blocked' : 'pass', mismatch.length ? `Root dependency map mismatch: ${mismatch.join(', ')}` : 'Root dependency maps align');
      } else add('lockfile_dependency_alignment', 'blocked', 'Cannot establish dependency alignment without matching lockfile identity');
    } catch (e) { add('lockfile_json', 'blocked', `Invalid lockfile JSON: ${e.message}`); }
  } else add('lockfile_presence', 'blocked', 'apps/api/package-lock.json is missing; obtain/generate it in trusted CI and review before committing');
  if (fs.existsSync(workflowPath)) {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    const required = ['workflow_dispatch', 'BUILD', 'npm ci', 'npm run build'];
    const missing = required.filter(s => !workflow.includes(s));
    add('verified_build_workflow', missing.length ? 'blocked' : 'pass', missing.length ? `Workflow missing expected markers: ${missing.join(', ')}` : 'Manual build workflow contains expected dispatch, confirmation, install and build markers');
  } else add('verified_build_workflow', 'blocked', 'Verified API build workflow is missing');
  const blockers = checks.filter(c => c.status === 'blocked');
  const report = {
    phase: 216,
    assessment: blockers.length ? 'CI_HANDOFF_BLOCKED' : 'LOCAL_HANDOFF_READY_REMOTE_BUILD_NOT_RUN',
    root,
    generatedAt: new Date().toISOString(),
    checks,
    blockers,
    hashes: {},
    actions: blockers.length ? [
      'Resolve every blocked check before requesting a build.',
      'If the API lockfile is missing, generate it in trusted CI from the authoritative manifest; review provenance and dependency changes before committing it.',
      'Push the reviewed changes to the authoritative GitHub repository.',
      'Run Actions → ForestOS API Verified Build with confirmation BUILD.',
      'Download and review the evidence artifact and complete workflow logs.'
    ] : [
      'Commit and push the reviewed manifest/lockfile/workflow to the authoritative repository.',
      'Run Actions → ForestOS API Verified Build with confirmation BUILD.',
      'Download and review evidence and logs; do not infer success from local checks.',
      'Only report a successful build when the authoritative job and install/build step outcomes are successful.'
    ],
    installExecuted: false,
    buildExecuted: false,
    remoteWorkflowExecuted: false,
    productionCleared: false
  };
  for (const [key, file] of [['manifest', manifestPath], ['lockfile', lockPath], ['workflow', workflowPath]]) {
    if (fs.existsSync(file)) report.hashes[key] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  return report;
}
function main(argv) {
  let root = process.cwd(), out = null;
  for (let i=0;i<argv.length;i++) {
    if (argv[i] === '--root' && argv[i+1]) root = argv[++i];
    else if (argv[i] === '--report' && argv[i+1]) out = argv[++i];
    else if (argv[i] === '--help') { console.log('Usage: node scripts/phase216_authoritative_ci_handoff.js [--root PROJECT_ROOT] [--report PATH]'); return 0; }
    else { console.error(`Unknown or incomplete argument: ${argv[i]}`); return 2; }
  }
  const report = inspect(root);
  const json = JSON.stringify(report, null, 2);
  if (out) fs.writeFileSync(path.resolve(out), json + '\n');
  console.log(json);
  return report.blockers.length ? 1 : 0;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { inspect, main };
