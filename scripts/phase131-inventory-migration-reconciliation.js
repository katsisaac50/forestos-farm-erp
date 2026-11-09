#!/usr/bin/env node
'use strict';

/**
 * Phase 131 — offline inventory migration reconciliation.
 * Compares baseline and post-change exports without connecting to MongoDB.
 * It does not execute or reverse migrations.
 *
 * Usage:
 * node scripts/phase131-inventory-migration-reconciliation.js <before.json> <after.json> [output-dir]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sha(value) { return crypto.createHash('sha256').update(JSON.stringify(value, null, 2) + '\n').digest('hex'); }
function rows(data, key) { return Array.isArray(data && data[key]) ? data[key] : null; }
function idOf(row) { return row && row._id != null ? String(row._id) : ''; }
function orgOf(row) { return row && row.organizationId ? String(row.organizationId).toLowerCase() : ''; }
function normNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function addFinding(findings, code, details = {}) { findings.push({ severity: 'BLOCKER', code, ...details }); }
function duplicateIds(dataRows, recordType, findings) {
  const seen = new Set();
  for (const [index, row] of dataRows.entries()) {
    const id = idOf(row);
    if (!id) addFinding(findings, 'MISSING_RECORD_ID', { recordType, index });
    else if (seen.has(id)) addFinding(findings, 'DUPLICATE_RECORD_ID', { recordType, recordId: id });
    seen.add(id);
  }
}
function indexById(dataRows) {
  const map = new Map();
  for (const row of dataRows) {
    const id = idOf(row);
    if (id && !map.has(id)) map.set(id, row);
  }
  return map;
}
function countByOrg(dataRows) {
  const result = {};
  for (const row of dataRows) {
    const org = orgOf(row) || '__UNASSIGNED__';
    result[org] = (result[org] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
function compareRecordSets(beforeRows, afterRows, recordType, findings) {
  const beforeMap = indexById(beforeRows);
  const afterMap = indexById(afterRows);
  const missingAfter = [...beforeMap.keys()].filter(id => !afterMap.has(id));
  const unexpectedAfter = [...afterMap.keys()].filter(id => !beforeMap.has(id));
  for (const id of missingAfter) addFinding(findings, 'SOURCE_RECORD_MISSING_AFTER', { recordType, recordId: id });
  for (const id of unexpectedAfter) addFinding(findings, 'UNEXPECTED_RECORD_AFTER', { recordType, recordId: id });
  const ownershipChanges = [];
  for (const [id, before] of beforeMap) {
    const after = afterMap.get(id);
    if (!after) continue;
    if (orgOf(before) !== orgOf(after)) {
      ownershipChanges.push({ recordType, recordId: id, beforeOrganizationId: before.organizationId ?? null, afterOrganizationId: after.organizationId ?? null });
    }
  }
  return { beforeCount: beforeRows.length, afterCount: afterRows.length, missingAfter, unexpectedAfter, ownershipChanges };
}
function compareNumericFields(beforeRows, afterRows, recordType, fields, findings) {
  const beforeMap = indexById(beforeRows), afterMap = indexById(afterRows);
  const differences = [];
  for (const [id, before] of beforeMap) {
    const after = afterMap.get(id);
    if (!after) continue;
    for (const field of fields) {
      const a = normNum(before[field]), b = normNum(after[field]);
      if (Number.isNaN(a) || Number.isNaN(b)) {
        addFinding(findings, 'INVALID_NUMERIC_FIELD', { recordType, recordId: id, field, before: before[field] ?? null, after: after[field] ?? null });
      } else if (a !== null && b !== null && a !== b) {
        differences.push({ recordType, recordId: id, field, before: a, after: b, delta: b - a });
      }
    }
  }
  return differences;
}
function runReconciliation(before, after) {
  const findings = [];
  const beforeItems = rows(before, 'stockItems'), afterItems = rows(after, 'stockItems');
  const beforeMovements = rows(before, 'stockMovements'), afterMovements = rows(after, 'stockMovements');
  if (!beforeItems) addFinding(findings, 'BEFORE_STOCK_ITEMS_ARRAY_REQUIRED');
  if (!afterItems) addFinding(findings, 'AFTER_STOCK_ITEMS_ARRAY_REQUIRED');
  if (!beforeMovements) addFinding(findings, 'BEFORE_STOCK_MOVEMENTS_ARRAY_REQUIRED');
  if (!afterMovements) addFinding(findings, 'AFTER_STOCK_MOVEMENTS_ARRAY_REQUIRED');
  const bi = beforeItems || [], ai = afterItems || [], bm = beforeMovements || [], am = afterMovements || [];
  duplicateIds(bi, 'stockItem', findings);
  duplicateIds(ai, 'stockItem', findings);
  duplicateIds(bm, 'stockMovement', findings);
  duplicateIds(am, 'stockMovement', findings);

  const itemComparison = compareRecordSets(bi, ai, 'stockItem', findings);
  const movementComparison = compareRecordSets(bm, am, 'stockMovement', findings);
  const itemQuantityDiffs = compareNumericFields(bi, ai, 'stockItem', ['quantityOnHand', 'quantity', 'unitCost', 'averageCost', 'totalValue'], findings);
  const movementQuantityDiffs = compareNumericFields(bm, am, 'stockMovement', ['quantity', 'unitCost', 'totalCost'], findings);

  const afterItemOrg = new Map(ai.map(r => [idOf(r), orgOf(r)]));
  const movementParentConflicts = [];
  for (const movement of am) {
    const parentId = movement && movement.itemId != null ? String(movement.itemId) : '';
    const parentOrg = afterItemOrg.get(parentId);
    const movementOrg = orgOf(movement);
    if (!parentOrg) {
      addFinding(findings, 'MOVEMENT_PARENT_MISSING_OR_UNASSIGNED', { recordId: idOf(movement), itemId: parentId });
    } else if (movementOrg && movementOrg !== parentOrg) {
      const conflict = { recordId: idOf(movement), itemId: parentId, movementOrganizationId: movement.organizationId, parentOrganizationId: parentOrg };
      movementParentConflicts.push(conflict);
      addFinding(findings, 'MOVEMENT_PARENT_ORG_CONFLICT', conflict);
    }
  }

  const blockers = findings.filter(f => f.severity === 'BLOCKER');
  return {
    phase: 131,
    title: 'Inventory Migration Reconciliation & Observability',
    generatedAt: new Date().toISOString(),
    mode: 'OFFLINE_EXPORT_COMPARISON',
    sourceHashes: { before: sha(before), after: sha(after) },
    counts: {
      before: { stockItems: bi.length, stockMovements: bm.length },
      after: { stockItems: ai.length, stockMovements: am.length },
      beforeStockItemsByOrganization: countByOrg(bi),
      afterStockItemsByOrganization: countByOrg(ai),
      beforeStockMovementsByOrganization: countByOrg(bm),
      afterStockMovementsByOrganization: countByOrg(am)
    },
    stockItems: itemComparison,
    stockMovements: movementComparison,
    numericDifferences: { stockItems: itemQuantityDiffs, stockMovements: movementQuantityDiffs },
    movementParentConflicts,
    findings,
    blockerCount: blockers.length,
    releaseGate: {
      reconciliationPassed: blockers.length === 0,
      migrationAuthorized: false,
      rollbackAutomaticallyAuthorized: false,
      reason: blockers.length ? 'Investigate all blockers and repeat reconciliation with trusted exports.' : 'Offline comparison passed only. No migration or rollback is authorized by this report.'
    }
  };
}
function main(argv) {
  if (argv.length < 2 || argv.length > 3 || argv.includes('--help')) {
    console.error('Usage: node scripts/phase131-inventory-migration-reconciliation.js <before.json> <after.json> [output-dir]');
    process.exitCode = 2; return;
  }
  try {
    const before = readJson(argv[0]), after = readJson(argv[1]);
    const outputDir = argv[2] || process.cwd();
    const report = runReconciliation(before, after);
    fs.mkdirSync(outputDir, { recursive: true });
    const reportPath = path.join(outputDir, 'phase131-reconciliation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ phase: 131, reconciliationPassed: report.releaseGate.reconciliationPassed, blockerCount: report.blockerCount, migrationAuthorized: false, reportPath }, null, 2));
    if (report.blockerCount) process.exitCode = 3;
  } catch (err) {
    console.error(`Phase 131 reconciliation error: ${err.message}`);
    process.exitCode = 2;
  }
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { runReconciliation, countByOrg };
