#!/usr/bin/env node
/**
 * ForestOS Phase 102 — API route inventory generator.
 * Static inventory only; findings are review signals, not proof of vulnerabilities.
 */
const fs = require('node:fs');
const path = require('node:path');
const srcRoot = path.resolve(__dirname, '../apps/api/src');
const outDir = path.resolve(__dirname, '../docs');
function walk(dir) {
  const items = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) items.push(...walk(full));
    else if (ent.isFile() && ent.name.endsWith('.controller.ts')) items.push(full);
  }
  return items;
}
function normalizePath(s) {
  return String(s || '').replace(/['"`]/g, '').replace(/^\//, '').replace(/\/+/g, '/');
}
const routes = [];
const files = walk(srcRoot);
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const controllerMatch = source.match(/@Controller\s*\(([^)]*)\)/);
  const controllerPath = controllerMatch ? normalizePath(controllerMatch[1]) : '(path not statically resolved)';
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : path.basename(file, '.ts');
  const classGuarded = /@UseGuards\s*\(/.test(source);
  const hasJwtGuard = /JwtAuthGuard/.test(source);
  const hasOrgResolution = /resolveContext\s*\(/.test(source) || /OrganizationAccessService/.test(source);
  const hasOrgFilter = /organizationFilter\s*\(/.test(source);
  const hasPublicDecorator = /@Public\s*\(/.test(source);
  const methodRx = /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(([^)]*)\)/g;
  let match;
  while ((match = methodRx.exec(source)) !== null) {
    const verb = match[1].toUpperCase();
    const rawPath = match[2].trim();
    const methodPath = rawPath ? normalizePath(rawPath) : '';
    const routePath = [controllerPath, methodPath].filter(Boolean).join('/').replace(/\/+/g, '/').replace(/\(path not statically resolved\)\//, '');
    const line = source.slice(0, match.index).split('\n').length;
    const before = source.slice(Math.max(0, match.index - 450), match.index);
    const methodPublic = /@Public\s*\(\s*\)\s*$/.test(before);
    const methodGuard = /@UseGuards\s*\(/.test(before);
    const signal = [];
    if (!classGuarded && !methodGuard && !hasPublicDecorator && !methodPublic) signal.push('review-auth-guard');
    if (!hasOrgResolution && !hasOrgFilter && !/auth|login|register|health|organization/i.test(file)) signal.push('review-tenant-scope');
    routes.push({
      verb, path: '/' + routePath, controller: className,
      file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
      line, classGuarded, methodGuard, jwtGuardMentioned: hasJwtGuard,
      publicDecoratorMentioned: hasPublicDecorator || methodPublic,
      orgContextSignal: hasOrgResolution, orgFilterSignal: hasOrgFilter,
      reviewSignals: signal
    });
  }
}
routes.sort((a,b) => a.file.localeCompare(b.file) || a.line-b.line);
const summary = {
  generatedAt: new Date().toISOString(),
  controllerFilesScanned: files.length,
  routeDecoratorsFound: routes.length,
  routesWithAuthReviewSignal: routes.filter(r => r.reviewSignals.includes('review-auth-guard')).length,
  routesWithTenantScopeReviewSignal: routes.filter(r => r.reviewSignals.includes('review-tenant-scope')).length,
  caveat: 'Static heuristics only. These counts are review signals, not confirmed vulnerabilities; guards may be global or delegated and tenant scoping may be inside called services.'
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'PHASE102_API_ROUTE_INVENTORY.json'), JSON.stringify({ summary, routes }, null, 2) + '\n');
const md = [
  '# ForestOS Phase 102 — API Route Inventory',
  '',
  '## Scope and interpretation',
  `- Controller files scanned: **${summary.controllerFilesScanned}**`,
  `- Route decorators found: **${summary.routeDecoratorsFound}**`,
  `- Routes with an authentication review signal: **${summary.routesWithAuthReviewSignal}**`,
  `- Routes with a tenant-scope review signal: **${summary.routesWithTenantScopeReviewSignal}**`,
  '',
  '> These are static heuristic review signals, not confirmed vulnerabilities. A route may be protected by global guards or delegate authorization to a service; conversely, the presence of a guard does not prove correct authorization. Review every flagged route manually and test it at runtime.',
  '',
  '## Route register',
  '',
  '| Method | Route (static approximation) | Controller | Source | Signals |',
  '|---|---|---|---|---|',
  ...routes.map(r => `| ${r.verb} | \`${r.path}\` | ${r.controller} | \`${r.file}:${r.line}\` | ${r.reviewSignals.length ? r.reviewSignals.join(', ') : 'none detected'} |`),
  '',
  '## Required audit workflow',
  '1. Confirm the route path and HTTP method against the running Nest application.',
  '2. Trace controller -> service -> database query, including aggregation, exports, and nested references.',
  '3. Confirm authentication, active organization membership, role authorization, and trusted organization scope.',
  '4. Exercise cross-tenant ID guessing, bulk updates/deletes, report/export access, and inactive memberships.',
  '5. Record evidence, severity, owner, fix, and retest result for each issue.',
  '',
  '## Limitations',
  '- Decorator parsing is regex-based and may miss dynamically composed decorators, multiline edge cases, inherited/global guards, and routes created outside controller files.',
  '- Route strings are approximations; parameter expressions and prefixes may not be fully resolved.',
  '- No endpoint was invoked and no database was accessed by this generator.',
  '- The inventory is a starting point for enterprise-grade security review, not a security certification.'
].join('\n');
fs.writeFileSync(path.join(outDir, 'PHASE102_API_ROUTE_INVENTORY.md'), md + '\n');
console.log(`Scanned ${files.length} controller files; found ${routes.length} route decorators.`);
console.log(`Auth review signals: ${summary.routesWithAuthReviewSignal}; tenant-scope review signals: ${summary.routesWithTenantScopeReviewSignal}.`);
console.log('Wrote docs/PHASE102_API_ROUTE_INVENTORY.md and .json');
