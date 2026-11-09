#!/usr/bin/env node
'use strict';

// Safe gate for Phase 191. No package installation or build occurs without an explicit mode.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const pkgPath = path.join(api, 'package.json');
const lockPath = path.join(api, 'package-lock.json');
const mode = process.argv[2] || 'preflight';
const timeout = Math.max(
  1000,
  Math.min(Number(process.env.FORESTOS_PHASE191_TIMEOUT_MS) || 300000, 900000)
);

function result(name, passed, detail) {
  return { name, passed, detail };
}

function stop(message, code = 2) {
  console.error(message);
  process.exit(code);
}

// Windows npm is a .cmd shim. Launch it through cmd.exe without shell:true.
// On Unix-like systems, continue to invoke npm directly.
function npmInvocation(args) {
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`],
    };
  }

  return { command: 'npm', args };
}

function runNpm(args, options = {}) {
  const invocation = npmInvocation(args);

  return spawnSync(invocation.command, invocation.args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
    ...options,
  });
}

if (!fs.existsSync(pkgPath)) {
  stop('BLOCKER: apps/api/package.json is missing.');
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
  stop(`BLOCKER: API package manifest is invalid JSON: ${e.message}`);
}

let lockValid = false;
let lockDetail = 'package-lock.json is missing';

if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

    lockValid = Boolean(
      lock.lockfileVersion &&
      lock.packages &&
      lock.packages['']
    );

    lockDetail = lockValid
      ? `valid npm lockfile v${lock.lockfileVersion}`
      : 'lockfile missing lockfileVersion/packages/root package entry';

    if (
      lockValid &&
      lock.packages[''].name &&
      lock.packages[''].name !== pkg.name
    ) {
      lockValid = false;
      lockDetail = 'lockfile root package name does not match package.json';
    }
  } catch (e) {
    lockDetail = `malformed lockfile: ${e.message}`;
  }
}

const npmVersionCheck = runNpm(['--version']);
const npmAvailable = npmVersionCheck.status === 0 && !npmVersionCheck.error;

const npmDetail = npmAvailable
  ? `Node ${process.version}; npm ${String(npmVersionCheck.stdout || '').trim()}`
  : `Node ${process.version}; npm launch failed: ${
      npmVersionCheck.error
        ? `${npmVersionCheck.error.code || 'ERROR'} ${npmVersionCheck.error.message}`
        : `exit status ${npmVersionCheck.status}; ${String(npmVersionCheck.stderr || '').trim()}`
    }`;

const checks = [
  result(
    'API manifest valid',
    Boolean(pkg.name && pkg.scripts?.build),
    pkg.name || 'missing package name/build script'
  ),
  result('npm lockfile valid and aligned', lockValid, lockDetail),
  result(
    'NestJS CLI declared',
    Boolean(pkg.devDependencies?.['@nestjs/cli']),
    pkg.devDependencies?.['@nestjs/cli'] || 'missing'
  ),
  result(
    'TypeScript config present',
    fs.existsSync(path.join(api, 'tsconfig.json')),
    'apps/api/tsconfig.json'
  ),
  result('Node and npm available', npmAvailable, npmDetail),
];

const report = {
  phase: 191,
  title: 'Clean Installation and Build Verification Gate',
  generatedAt: new Date().toISOString(),
  mode,
  apiPackage: pkg.name,
  checks,
  passed: checks.filter(c => c.passed).length,
  total: checks.length,
  installExecuted: false,
  buildExecuted: false,
  productionCleared: false,
  blockers: checks.filter(c => !c.passed).map(c => c.name),
  nextActions: [],
};

if (mode === 'preflight') {
  report.nextActions = lockValid
    ? [
        'Run with mode install to execute npm ci.',
        'After a successful install, run with mode build to execute the NestJS build.',
      ]
    : [
        'Generate the real apps/api/package-lock.json in a registry-enabled environment.',
        'Review and commit the lockfile, then rerun preflight.',
      ];
} else if (mode === 'install' || mode === 'build') {
  if (!lockValid) {
    stop(
      'BLOCKED: a valid, package-aligned apps/api/package-lock.json is required. No command was executed.'
    );
  }

  if (
    mode === 'build' &&
    !fs.existsSync(
      path.join(
        api,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'nest.cmd' : 'nest'
      )
    )
  ) {
    stop('BLOCKED: NestJS CLI is not installed. Run mode install first.');
  }

  const args =
    mode === 'install'
      ? ['ci', '--no-audit', '--no-fund']
      : ['run', 'build'];

  console.log(
    `Executing npm ${args.join(' ')} in apps/api (timeout ${timeout}ms)`
  );

  const child = runNpm(args, { cwd: api });
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;

  report.command = `npm ${args.join(' ')}`;
  report.exitCode = child.status;
  report.timedOut = Boolean(child.error && child.error.code === 'ETIMEDOUT');
  report.spawnError = child.error
    ? {
        code: child.error.code || null,
        message: child.error.message,
      }
    : null;

  report.installExecuted = mode === 'install';
  report.buildExecuted = mode === 'build';
  report.outputTail = output.slice(-12000);
  report.commandPassed = child.status === 0 && !child.error;

  report.nextActions = report.commandPassed
    ? mode === 'install'
      ? ['Run node scripts/phase191-clean-install-build-gate.js build.']
      : ['Run controlled HTTP authentication and tenant-isolation integration tests.']
    : [
        'Review command output and resolve the reported installation/build error.',
        'Rerun the failed command after remediation.',
      ];
} else {
  stop('Usage: node scripts/phase191-clean-install-build-gate.js [preflight|install|build]');
}

const reportPath = path.join(root, 'PHASE191_CLEAN_INSTALL_BUILD_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify(report, null, 2));

if (report.blockers.length || report.commandPassed === false) {
  process.exitCode = 2;
}
