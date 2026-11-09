#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

function nonNegative(value, label, errors, required = false) {
  if (value === undefined || value === null) {
    if (required) errors.push(`${label} is required`);
    return 0;
  }
  if (!Number.isFinite(value) || value < 0) errors.push(`${label} must be a finite non-negative number`);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
function ratio(n, d) { return d > 0 ? Math.round((n / d) * 10000) / 100 : null; }
function round(v, digits = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const p = 10 ** digits;
  return Math.round((v + Number.EPSILON) * p) / p;
}
function buildScorecards(input = {}) {
  const errors = [], warnings = [];
  const forestry = input.forestry && typeof input.forestry === "object" ? input.forestry : {};
  const apiary = input.apiary && typeof input.apiary === "object" ? input.apiary : {};
  const finance = input.finance && typeof input.finance === "object" ? input.finance : {};
  const val = (obj, key, label, required = false) => nonNegative(obj[key], label, errors, required);
  const plantedAcres = val(forestry, "plantedAcres", "forestry.plantedAcres", true);
  const treesPlanted = val(forestry, "treesPlanted", "forestry.treesPlanted", true);
  const survivingTrees = val(forestry, "survivingTrees", "forestry.survivingTrees", true);
  const seedlingsPlanted = val(forestry, "seedlingsPlanted", "forestry.seedlingsPlanted");
  const maintenanceCostUGX = val(forestry, "maintenanceCostUGX", "forestry.maintenanceCostUGX");
  const forestrySalesUGX = val(forestry, "salesUGX", "forestry.salesUGX");
  const hives = val(apiary, "hives", "apiary.hives", true);
  const activeColonies = val(apiary, "activeColonies", "apiary.activeColonies", true);
  const honeyKg = val(apiary, "honeyKg", "apiary.honeyKg");
  const honeySalesUGX = val(apiary, "honeySalesUGX", "apiary.honeySalesUGX");
  const apiaryCostsUGX = val(apiary, "apiaryCostsUGX", "apiary.apiaryCostsUGX");
  const reinvestmentUGX = val(finance, "reinvestmentUGX", "finance.reinvestmentUGX");
  if (survivingTrees > treesPlanted) errors.push("forestry.survivingTrees cannot exceed forestry.treesPlanted");
  if (activeColonies > hives) errors.push("apiary.activeColonies cannot exceed apiary.hives");
  if (plantedAcres === 0 && treesPlanted > 0) errors.push("forestry.plantedAcres must be greater than zero when trees are planted");
  const harvestForecast = (Array.isArray(forestry.harvestForecast) ? forestry.harvestForecast : []).map((row, i) => {
    row = row && typeof row === "object" ? row : {};
    const volumeM3 = nonNegative(row.volumeM3, `forestry.harvestForecast[${i}].volumeM3`, errors, true);
    return { period: typeof row.period === "string" && row.period.trim() ? row.period : `Unspecified ${i + 1}`, volumeM3 };
  });
  if (harvestForecast.some(x => x.period.startsWith("Unspecified "))) warnings.push("Some harvest forecast periods are missing; assign a period before operational use.");
  const treeSurvivalPct = treesPlanted > 0 ? ratio(survivingTrees, treesPlanted) : null;
  const treesPerAcre = plantedAcres > 0 ? round(treesPlanted / plantedAcres) : null;
  const colonyOccupancyPct = hives > 0 ? ratio(activeColonies, hives) : null;
  const honeyKgPerActiveColony = activeColonies > 0 ? round(honeyKg / activeColonies) : null;
  const apiaryGrossMarginProxyUGX = round(honeySalesUGX - apiaryCostsUGX);
  const totalRecordedSalesUGX = round(honeySalesUGX + forestrySalesUGX);
  const totalRecordedCostsUGX = round(apiaryCostsUGX + maintenanceCostUGX);
  const recordedOperatingSurplusProxyUGX = round(totalRecordedSalesUGX - totalRecordedCostsUGX);
  const findings = [], recommendations = [];
  if (treeSurvivalPct !== null && treeSurvivalPct < 85) {
    findings.push({ area: "forestry", level: "attention", message: `Tree survival is ${treeSurvivalPct}%, below the 85% planning threshold.` });
    recommendations.push({ priority: "high", area: "forestry", action: "Inspect mortality by block, confirm causes, and schedule gap planting where appropriate." });
  } else if (treeSurvivalPct !== null) findings.push({ area: "forestry", level: "positive", message: `Tree survival is ${treeSurvivalPct}%.` });
  if (colonyOccupancyPct !== null && colonyOccupancyPct < 70) {
    findings.push({ area: "apiary", level: "attention", message: `Colony occupancy is ${colonyOccupancyPct}%, below the 70% planning threshold.` });
    recommendations.push({ priority: "high", area: "apiary", action: "Inspect unoccupied hives, hive condition, forage, and colony establishment records." });
  } else if (colonyOccupancyPct !== null) findings.push({ area: "apiary", level: "positive", message: `Colony occupancy is ${colonyOccupancyPct}%.` });
  if (activeColonies > 0 && honeyKg === 0) recommendations.push({ priority: "medium", area: "apiary", action: "Check whether honey harvest records are complete for the reporting period." });
  if (apiaryGrossMarginProxyUGX < 0) {
    findings.push({ area: "finance", level: "attention", message: "Recorded apiary costs exceed recorded honey sales." });
    recommendations.push({ priority: "high", area: "finance", action: "Review apiary costs and sales records; this proxy is not a full profit calculation." });
  }
  if (reinvestmentUGX > recordedOperatingSurplusProxyUGX) {
    findings.push({ area: "finance", level: "attention", message: "Recorded reinvestment exceeds the recorded operating-surplus proxy." });
    recommendations.push({ priority: "medium", area: "finance", action: "Confirm the funding source and protect working capital before committing further reinvestment." });
  }
  if (harvestForecast.length) findings.push({ area: "forestry", level: "information", message: `Harvest forecast contains ${harvestForecast.length} period(s), totalling ${round(harvestForecast.reduce((s, x) => s + x.volumeM3, 0))} m³.` });
  if (!findings.length) findings.push({ area: "overall", level: "information", message: "No threshold findings could be produced from the supplied values." });
  return {
    schemaVersion: "1.0", phase: 139, generatedAt: new Date().toISOString(),
    status: errors.length ? "invalid_input" : "ok", errors, warnings,
    scorecards: {
      forestry: { plantedAcres, treesPlanted, survivingTrees, seedlingsPlanted, treeSurvivalPct, treesPerAcre,
        maintenanceCostUGX: round(maintenanceCostUGX), maintenanceCostPerPlantedAcreUGX: plantedAcres > 0 ? round(maintenanceCostUGX / plantedAcres) : null,
        recordedSalesUGX: round(forestrySalesUGX), harvestForecast,
        forecastVolumeM3: round(harvestForecast.reduce((s, x) => s + x.volumeM3, 0)) },
      apiary: { hives, activeColonies, unoccupiedHives: Math.max(0, hives - activeColonies), colonyOccupancyPct,
        honeyKg: round(honeyKg), honeyKgPerActiveColony, honeySalesUGX: round(honeySalesUGX), apiaryCostsUGX: round(apiaryCostsUGX),
        honeyRevenuePerKgUGX: honeyKg > 0 ? round(honeySalesUGX / honeyKg) : null, grossMarginProxyUGX: apiaryGrossMarginProxyUGX },
      finance: { reinvestmentUGX: round(reinvestmentUGX), totalRecordedSalesUGX, totalRecordedCostsUGX, recordedOperatingSurplusProxyUGX }
    },
    findings, recommendations,
    limitations: [
      "Analytics use only the JSON supplied to this command; no live farm, database, sensor, or accounting data is fetched.",
      "Apiary gross-margin and combined operating-surplus figures are proxies, not audited profit; unprovided labor, capex, depreciation, taxes, and overheads are excluded.",
      "Thresholds are planning signals, not universal agronomic or beekeeping standards; review them against local conditions and the farm operating plan.",
      "A forecast volume is not harvest authorization. Confirm stand age, inventory, permits, access, market, and management plan before harvesting."
    ]
  };
}
function main(argv) {
  const args = argv.slice(2), inputArg = args.find(x => x.startsWith("--input=")), outputArg = args.find(x => x.startsWith("--output="));
  if (!inputArg) { console.error("Usage: node scripts/phase139-forestry-apiary-scorecards.js --input=path/to/data.json [--output=path/to/report.json]"); process.exitCode = 2; return; }
  let input;
  try { input = JSON.parse(fs.readFileSync(path.resolve(inputArg.slice(8)), "utf8")); }
  catch (e) { console.error(`Unable to read input JSON: ${e.message}`); process.exitCode = 2; return; }
  const report = buildScorecards(input), rendered = JSON.stringify(report, null, 2) + "\n";
  if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice(9)), rendered); else process.stdout.write(rendered);
  if (report.status !== "ok") process.exitCode = 1;
}
if (require.main === module) main(process.argv);
module.exports = { buildScorecards };
