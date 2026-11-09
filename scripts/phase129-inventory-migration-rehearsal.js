#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 129 — offline inventory migration rehearsal.
 * Reads JSON exports and an approval manifest, simulates ownership assignments
 * in memory, and emits a report + rollback manifest. It never connects to or
 * writes to MongoDB.
 *
 * Usage:
 * node scripts/phase129-inventory-migration-rehearsal.js <export.json> <ownership-manifest.json> [baseline.json] [output-dir]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function isObjectId(v) {
  return typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);
}
function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function getId(row) {
  return row && row._id != null ? String(row._id) : '';
}
function countByOrg(rows, orgField = 'organizationId') {
  const result = {};
  for (const row of rows) {
    const org = row[orgField] ? String(row[orgField]).toLowerCase() : '__UNASSIGNED__';
    result[org] = (result[org] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
function validateUniqueIds(rows, type, findings) {
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const id = getId(rows[i]);
    if (!id) findings.push({ severity: 'BLOCKER', code: 'MISSING_RECORD_ID', recordType: type, row: i });
    else if (seen.has(id)) findings.push({ severity: 'BLOCKER', code: 'DUPLICATE_RECORD_ID', recordType: type, recordId: id });
    seen.add(id);
  }
}
function runRehearsal(exportData, manifest, baseline = null) {
  const findings = [];
  const stockItems = Array.isArray(exportData.stockItems) ? exportData.stockItems : [];
  const stockMovements = Array.isArray(exportData.stockMovements) ? exportData.stockMovements : [];
  const approvals = Array.isArray(manifest.approvals) ? manifest.approvals : [];

  if (!Array.isArray(exportData.stockItems)) findings.push({ severity: 'BLOCKER', code: 'STOCK_ITEMS_ARRAY_REQUIRED' });
  if (!Array.isArray(exportData.stockMovements)) findings.push({ severity: 'BLOCKER', code: 'STOCK_MOVEMENTS_ARRAY_REQUIRED' });
  if (!Array.isArray(manifest.approvals)) findings.push({ severity: 'BLOCKER', code: 'APPROVALS_ARRAY_REQUIRED' });

  validateUniqueIds(stockItems, 'stockItem', findings);
  validateUniqueIds(stockMovements, 'stockMovement', findings);

  const itemIds = new Set(stockItems.map(getId).filter(Boolean));
  const itemApprovalMap = new Map();
  const approvalKeys = new Set();

  for (const approval of approvals) {
    const type = approval && approval.recordType;
    const recordId = approval && approval.recordId != null ? String(approval.recordId) : '';
    const key = `${type}:${recordId}`;
    if (approvalKeys.has(key)) {
      findings.push({ severity: 'BLOCKER', code: 'DUPLICATE_APPROVAL', recordType: type || '', recordId });
      continue;
    }
    approvalKeys.add(key);
    if (type !== 'stockItem') {
      findings.push({ severity: 'BLOCKER', code: 'UNSUPPORTED_APPROVAL_TYPE', recordType: type || '', recordId });
      continue;
    }
    if (!itemIds.has(recordId)) {
      findings.push({ severity: 'BLOCKER', code: 'APPROVAL_RECORD_NOT_IN_EXPORT', recordType: type, recordId });
      continue;
    }
    if (!isObjectId(approval.organizationId)) {
      findings.push({ severity: 'BLOCKER', code: 'INVALID_APPROVED_ORGANIZATION_ID', recordType: type, recordId });
      continue;
    }
    if (!String(approval.approvedBy || '').trim() || !String(approval.evidenceRef || '').trim()) {
      findings.push({ severity: 'BLOCKER', code: 'APPROVAL_EVIDENCE_REQUIRED', recordType: type, recordId });
      continue;
    }
    itemApprovalMap.set(recordId, String(approval.organizationId).toLowerCase());
  }

  const simulatedItems = stockItems.map(row => ({ ...row }));
  const simulatedMovements = stockMovements.map(row => ({ ...row }));
  const itemOrgById = new Map();
  const rollback = [];
  const proposedChanges = [];

  for (let i = 0; i < simulatedItems.length; i++) {
    const row = simulatedItems[i];
    const id = getId(row);
    const approvedOrg = itemApprovalMap.get(id);
    const currentOrg = row.organizationId ? String(row.organizationId).toLowerCase() : '';
    if (approvedOrg) {
      itemOrgById.set(id, approvedOrg);
      if (currentOrg && currentOrg !== approvedOrg) {
        findings.push({ severity: 'BLOCKER', code: 'EXISTING_ORG_CONFLICTS_WITH_APPROVAL', recordType: 'stockItem', recordId: id, currentOrganizationId: currentOrg, approvedOrganizationId: approvedOrg });
      } else if (!currentOrg) {
        rollback.push({ recordType: 'stockItem', recordId: id, field: 'organizationId', before: row.organizationId ?? null, restoreValue: row.organizationId ?? null, appliedValue: approvedOrg });
        proposedChanges.push({ recordType: 'stockItem', recordId: id, field: 'organizationId', from: row.organizationId ?? null, to: approvedOrg });
        row.organizationId = approvedOrg;
      }
    } else if (!currentOrg) {
      findings.push({ severity: 'BLOCKER', code: 'MISSING_OWNERSHIP_APPROVAL', recordType: 'stockItem', recordId: id });
    } else {
      itemOrgById.set(id, currentOrg);
    }
  }

  const movementCodes = new Set();
  for (const row of simulatedMovements) {
    const id = getId(row);
    const itemId = row.itemId != null ? String(row.itemId) : '';
    const parent = simulatedItems.find(item => getId(item) === itemId);
    if (!parent) {
      findings.push({ severity: 'BLOCKER', code: 'ORPHAN_MOVEMENT', recordType: 'stockMovement', recordId: id, itemId });
      continue;
    }
    const parentOrg = parent.organizationId ? String(parent.organizationId).toLowerCase() : '';
    const currentOrg = row.organizationId ? String(row.organizationId).toLowerCase() : '';
    if (!parentOrg) {
      findings.push({ severity: 'BLOCKER', code: 'PARENT_OWNERSHIP_UNRESOLVED', recordType: 'stockMovement', recordId: id, itemId });
      continue;
    }
    if (currentOrg && currentOrg !== parentOrg) {
      findings.push({ severity: 'BLOCKER', code: 'MOVEMENT_PARENT_ORG_CONFLICT', recordType: 'stockMovement', recordId: id, currentOrganizationId: currentOrg, parentOrganizationId: parentOrg });
      continue;
    }
    if (!currentOrg) {
      rollback.push({ recordType: 'stockMovement', recordId: id, field: 'organizationId', before: row.organizationId ?? null, restoreValue: row.organizationId ?? null, appliedValue: parentOrg });
      proposedChanges.push({ recordType: 'stockMovement', recordId: id, field: 'organizationId', from: row.organizationId ?? null, to: parentOrg, basis: 'verified_parent_stock_item' });
      row.organizationId = parentOrg;
    }
    const code = String(row.movementCode || '').trim();
    if (code) {
      const key = `${String(row.organizationId).toLowerCase()}:${code}`;
      if (movementCodes.has(key)) findings.push({ severity: 'BLOCKER', code: 'DUPLICATE_MOVEMENT_CODE_WITHIN_ORG', recordType: 'stockMovement', recordId: id, movementCode: code, organizationId: row.organizationId });
      movementCodes.add(key);
    }
  }

  const itemCodes = new Set();
  for (const row of simulatedItems) {
    const code = String(row.itemCode || '').trim();
    if (!code || !row.organizationId) continue;
    const key = `${String(row.organizationId).toLowerCase()}:${code}`;
    if (itemCodes.has(key)) findings.push({ severity: 'BLOCKER', code: 'DUPLICATE_ITEM_CODE_WITHIN_ORG', recordType: 'stockItem', recordId: getId(row), itemCode: code, organizationId: row.organizationId });
    itemCodes.add(key);
  }

  const actualCounts = {
    stockItems: stockItems.length,
    stockMovements: stockMovements.length,
    approvals: approvals.length
  };
  if (baseline) {
    for (const key of ['stockItems', 'stockMovements']) {
      if (baseline[key] !== undefined && baseline[key] !== actualCounts[key]) {
        findings.push({ severity: 'BLOCKER', code: 'BASELINE_COUNT_MISMATCH', collection: key, expected: baseline[key], actual: actualCounts[key] });
      }
    }
  }

  const blockers = findings.filter(f => f.severity === 'BLOCKER');
  const report = {
    phase: 129,
    title: 'Inventory Migration Rehearsal & Rollback Verification',
    generatedAt: new Date().toISOString(),
    mode: 'OFFLINE_IN_MEMORY_SIMULATION',
    sourceCounts: actualCounts,
    projectedCounts: {
      stockItems: simulatedItems.length,
      stockMovements: simulatedMovements.length,
      stockItemsByOrganization: countByOrg(simulatedItems),
      stockMovementsByOrganization: countByOrg(simulatedMovements)
    },
    mapping: {
      stockItemsWithApprovedOwnership: simulatedItems.filter(r => itemApprovalMap.has(getId(r))).length,
      stockItemsWithExistingOwnership: stockItems.filter(r => r.organizationId).length,
      movementsInheritingVerifiedParentOwnership: proposedChanges.filter(c => c.recordType === 'stockMovement').length,
      proposedOrganizationAssignments: proposedChanges.length
    },
    proposedChanges,
    findings,
    blockerCount: blockers.length,
    rollbackManifest: {
      formatVersion: 1,
      description: 'Reverse the proposed organizationId assignments if and only if a separately approved migration is later applied. This rehearsal did not apply changes.',
      entries: rollback
    },
    integrity: {
      sourceExportSha256: sha256(stableJson(exportData)),
      ownershipManifestSha256: sha256(stableJson(manifest)),
      baselineSha256: baseline ? sha256(stableJson(baseline)) : null
    },
    releaseGate: {
      rehearsalPassed: blockers.length === 0,
      mayApplyMigration: false,
      requiresHumanApproval: true,
      reason: blockers.length ? 'Blockers exist; resolve and rerun the rehearsal.' : 'Offline rehearsal passed only; separate reviewed migration plan and explicit approval are still required.'
    }
  };
  return { report, rollback: report.rollbackManifest };
}

function main(argv) {
  if (argv.length < 2 || argv.length > 4 || argv.includes('--help')) {
    console.error('Usage: node scripts/phase129-inventory-migration-rehearsal.js <export.json> <ownership-manifest.json> [baseline.json] [output-dir]');
    process.exitCode = 2;
    return;
  }
  try {
    const exportData = readJson(argv[0]);
    const manifest = readJson(argv[1]);
    let baseline = null;
    let outputDir = process.cwd();
    if (argv[2]) {
      if (argv[3]) {
        baseline = readJson(argv[2]);
        outputDir = argv[3];
      } else if (fs.existsSync(argv[2]) && fs.statSync(argv[2]).isDirectory()) {
        outputDir = argv[2];
      } else {
        baseline = readJson(argv[2]);
      }
    }
    const { report, rollback } = runRehearsal(exportData, manifest, baseline);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'phase129-rehearsal-report.json'), stableJson(report), { flag: 'w' });
    fs.writeFileSync(path.join(outputDir, 'phase129-rollback-manifest.json'), stableJson(rollback), { flag: 'w' });
    console.log(JSON.stringify({
      phase: 129,
      rehearsalPassed: report.releaseGate.rehearsalPassed,
      blockerCount: report.blockerCount,
      proposedAssignments: report.mapping.proposedOrganizationAssignments,
      mayApplyMigration: false,
      reportPath: path.join(outputDir, 'phase129-rehearsal-report.json'),
      rollbackPath: path.join(outputDir, 'phase129-rollback-manifest.json')
    }, null, 2));
    if (report.blockerCount) process.exitCode = 3;
  } catch (err) {
    console.error(`Phase 129 rehearsal failed: ${err.message}`);
    process.exitCode = 2;
  }
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { runRehearsal, countByOrg, isObjectId };
