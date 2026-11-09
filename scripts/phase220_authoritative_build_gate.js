#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
function parseArgs(argv) { const out = {}; for (let i=0;i<argv.length;i++) { if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : true; } return out; }
function evaluate(evidence, expectedCommit) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
  add('evidence_is_object', !!evidence && typeof evidence === 'object' && !Array.isArray(evidence), 'Evidence must be a JSON object');
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return {phase:220,status:'BLOCKED',productionCleared:false,checks,blockers:['Evidence is not a JSON object']};
  add('expected_commit_is_full_sha', /^[a-f0-9]{40}$/i.test(expectedCommit || ''), 'Supply the full 40-character commit SHA used for the workflow run');
  add('commit_matches', !!expectedCommit && String(evidence.commitSha || evidence.commit || '').toLowerCase() === expectedCommit.toLowerCase(), 'Evidence commit must match the requested commit');
  add('install_succeeded', evidence.installOutcome === 'success', `installOutcome=${evidence.installOutcome || 'missing'}`);
  add('build_succeeded', evidence.buildOutcome === 'success', `buildOutcome=${evidence.buildOutcome || 'missing'}`);
  add('job_succeeded', evidence.jobConclusion === 'success' || evidence.workflowConclusion === 'success', `job/workflow conclusion=${evidence.jobConclusion || evidence.workflowConclusion || 'missing'}`);
  add('production_not_auto_cleared', evidence.productionCleared !== true, 'Build evidence must not automatically authorize production');
  const blockers = checks.filter(c=>!c.pass).map(c=>`${c.name}: ${c.detail}`);
  const ready = blockers.length === 0;
  return {phase:220,status:ready?'BUILD_EVIDENCE_VERIFIED':'BLOCKED',productionCleared:false,checks,blockers,warning:'This verifies supplied evidence fields only; confirm the workflow run and artifact provenance in GitHub Actions.'};
}
function run(argv=process.argv.slice(2)) { const args=parseArgs(argv); if (!args.evidence || !args['expected-commit']) { console.error('Usage: node scripts/phase220_authoritative_build_gate.js --evidence PATH --expected-commit FULL_40_CHAR_SHA [--report PATH]'); return 2; }
 let evidence; try { evidence=JSON.parse(fs.readFileSync(path.resolve(args.evidence),'utf8')); } catch(e) { console.error(`Cannot read valid evidence JSON: ${e.message}`); return 2; }
 const result=evaluate(evidence,args['expected-commit']); const output=JSON.stringify(result,null,2)+'\n'; if(args.report) fs.writeFileSync(path.resolve(args.report),output); process.stdout.write(output); return result.status==='BUILD_EVIDENCE_VERIFIED'?0:1; }
if(require.main===module) process.exitCode=run(); module.exports={evaluate,run};
