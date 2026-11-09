#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gate = fs.readFileSync(
  path.join(__dirname, 'phase191-clean-install-build-gate.js'),
  'utf8'
);
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8')
);

const checks = [
  ['preflight is the default mode', () =>
    assert.match(gate, /process\.argv\[2\] \|\| 'preflight'/)],

  ['requires API manifest', () =>
    assert.match(gate, /apps\/api\/package\.json is missing/)],

  ['validates lockfile structure', () =>
    assert.match(gate, /lock\.lockfileVersion &&[\s\S]*lock\.packages &&[\s\S]*lock\.packages\[''\]/)],

  ['checks lockfile package name alignment', () =>
    assert.match(gate, /lock\.packages\[''\]\.name !== pkg\.name/)],

  ['install mode uses npm ci', () =>
    assert.match(gate, /\['ci', '--no-audit', '--no-fund'\]/)],

  ['build mode uses declared build script', () =>
    assert.match(gate, /\['run', 'build'\]/)],

  ['does not execute install or build during preflight', () =>
    assert.match(gate, /if \(mode === 'preflight'\)/)],

  ['blocks execution without a valid lockfile', () =>
    assert.match(gate, /BLOCKED: a valid, package-aligned/)],

  ['command execution has a bounded timeout', () =>
    assert.match(gate, /timeout,\s*maxBuffer/)],

  ['captures command exit status and timeout', () =>
    assert.match(gate, /report\.exitCode = child\.status/) &&
    assert.match(gate, /report\.timedOut = Boolean/)],

  ['uses Windows cmd.exe for npm command shims', () =>
    assert.match(gate, /process\.platform === 'win32'/) &&
    assert.match(gate, /process\.env\.ComSpec \|\| 'cmd\.exe'/) &&
    assert.match(gate, /npm\.cmd/)],

  ['keeps direct npm invocation on non-Windows platforms', () =>
    assert.match(gate, /return \{ command: 'npm', args \}/)],

  ['uses shared npm launcher for all npm operations', () =>
    assert.match(gate, /function runNpm\(args, options = \{\}\)/) &&
    assert.match(gate, /const npmVersionCheck = runNpm\(\['--version'\]\)/) &&
    assert.match(gate, /const child = runNpm\(args, \{ cwd: api \}\)/)],

  ['records npm process launch errors', () =>
    assert.match(gate, /report\.spawnError = child\.error/) &&
    assert.match(gate, /npm launch failed/)],

  ['records report without granting production clearance', () =>
    assert.match(gate, /productionCleared: false/)],

  ['exposes Phase 191 gate commands', () =>
    assert.ok(
      pkg.scripts['preflight:phase191:build'] &&
      pkg.scripts['test:phase191:contract']
    )],
];

let failed = 0;

for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

console.log(`\nPhase 191 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
