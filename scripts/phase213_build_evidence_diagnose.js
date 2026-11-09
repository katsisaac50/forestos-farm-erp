#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function diagnose(report) {
  const actions = [];
  const validOutcomes = new Set(['success', 'failure', 'cancelled', 'skipped', 'unknown']);
  const keys = ['lockfileStepOutcome', 'installStepOutcome', 'buildStepOutcome'];
  const outcomes = Object.fromEntries(keys.map(k => [k, typeof report[k] === 'string' && validOutcomes.has(report[k]) ? report[k] : 'unknown']));
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('Evidence must be a JSON object.');
  if (outcomes.lockfileStepOutcome !== 'success') actions.push('Resolve lockfile preparation first: inspect the lockfile step logs and ensure package.json and package-lock.json are aligned.');
  if (outcomes.installStepOutcome !== 'success') actions.push('Resolve dependency installation: inspect npm ci logs, verify the lockfile is committed and consistent, and check registry/network availability.');
  if (outcomes.buildStepOutcome !== 'success') actions.push('Resolve API compilation: inspect npm run build logs and fix the first TypeScript/NestJS compiler error before retrying.');
  if (report.jobConclusion !== 'success') actions.push('Review the complete GitHub Actions job conclusion and any failed steps; a successful build step alone does not make the whole job successful.');
  if (!report.sourceCommit || !/^[0-9a-f]{40}$/i.test(report.sourceCommit)) actions.push('Verify sourceCommit is a full 40-character Git commit SHA before comparing evidence with the intended revision.');
  if (report.productionCleared !== false) actions.push('Evidence must not be interpreted as production clearance; require separate review and release approval.');
  const verified = outcomes.lockfileStepOutcome === 'success' && outcomes.installStepOutcome === 'success' && outcomes.buildStepOutcome === 'success' && report.apiBuildSucceeded === true && report.jobConclusion === 'success' && /^[0-9a-f]{40}$/i.test(report.sourceCommit || '') && report.productionCleared === false;
  if (verified) actions.push('Build evidence is internally consistent for the recorded commit. Continue with runtime, integration, security, and deployment checks; this is not production approval.');
  if (actions.length === 0) actions.push('Evidence is incomplete or has unrecognized fields. Inspect the original workflow logs and report.');
  return { phase: 213, evidenceAssessment: verified ? 'BUILD_VERIFIED_NOT_PRODUCTION_CLEARED' : 'BUILD_NOT_VERIFIED', sourceCommit: report.sourceCommit || null, jobConclusion: report.jobConclusion || 'unknown', stepOutcomes: outcomes, apiBuildSucceededFlag: report.apiBuildSucceeded === true, productionCleared: false, actions };
}
function main(argv) {
  const i = argv.indexOf('--evidence');
  if (i < 0 || !argv[i + 1]) throw new Error('Usage: node scripts/phase213_build_evidence_diagnose.js --evidence PATH [--report PATH]');
  const input = path.resolve(argv[i + 1]);
  const report = JSON.parse(fs.readFileSync(input, 'utf8'));
  const result = diagnose(report);
  const ri = argv.indexOf('--report');
  const output = ri >= 0 && argv[ri + 1] ? path.resolve(argv[ri + 1]) : null;
  const serialized = JSON.stringify(result, null, 2) + '\n';
  if (output) fs.writeFileSync(output, serialized); else process.stdout.write(serialized);
  if (result.evidenceAssessment !== 'BUILD_VERIFIED_NOT_PRODUCTION_CLEARED') process.exitCode = 2;
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (err) { console.error(`Evidence diagnosis failed: ${err.message}`); process.exitCode = 1; } }
module.exports = { diagnose };
