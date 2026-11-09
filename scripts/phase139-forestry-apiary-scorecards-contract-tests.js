#!/usr/bin/env node
"use strict";
const assert = require("assert");
const { buildScorecards } = require("./phase139-forestry-apiary-scorecards");
const base = {
 forestry: { plantedAcres: 7, treesPlanted: 7000, survivingTrees: 6500, seedlingsPlanted: 500, maintenanceCostUGX: 210000, salesUGX: 100000, harvestForecast: [{period:"2031-Q1", volumeM3:120}] },
 apiary: { hives:10, activeColonies:7, honeyKg:42, honeySalesUGX:420000, apiaryCostsUGX:120000 },
 finance: { reinvestmentUGX:150000 }
};
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch(e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode=1; } }
test("valid scorecards",()=>assert.strictEqual(buildScorecards(base).status,"ok"));
test("phase number",()=>assert.strictEqual(buildScorecards(base).phase,139));
test("tree survival",()=>assert.strictEqual(buildScorecards(base).scorecards.forestry.treeSurvivalPct,92.86));
test("trees per acre",()=>assert.strictEqual(buildScorecards(base).scorecards.forestry.treesPerAcre,1000));
test("maintenance cost per acre",()=>assert.strictEqual(buildScorecards(base).scorecards.forestry.maintenanceCostPerPlantedAcreUGX,30000));
test("colony occupancy",()=>assert.strictEqual(buildScorecards(base).scorecards.apiary.colonyOccupancyPct,70));
test("unoccupied hives",()=>assert.strictEqual(buildScorecards(base).scorecards.apiary.unoccupiedHives,3));
test("honey per colony",()=>assert.strictEqual(buildScorecards(base).scorecards.apiary.honeyKgPerActiveColony,6));
test("revenue per kg",()=>assert.strictEqual(buildScorecards(base).scorecards.apiary.honeyRevenuePerKgUGX,10000));
test("apiary margin proxy",()=>assert.strictEqual(buildScorecards(base).scorecards.apiary.grossMarginProxyUGX,300000));
test("combined sales",()=>assert.strictEqual(buildScorecards(base).scorecards.finance.totalRecordedSalesUGX,520000));
test("combined costs",()=>assert.strictEqual(buildScorecards(base).scorecards.finance.totalRecordedCostsUGX,330000));
test("surplus proxy",()=>assert.strictEqual(buildScorecards(base).scorecards.finance.recordedOperatingSurplusProxyUGX,190000));
test("forecast sum",()=>assert.strictEqual(buildScorecards(base).scorecards.forestry.forecastVolumeM3,120));
test("forecast finding",()=>assert(buildScorecards(base).findings.some(x=>x.message.includes("1 period"))));
test("low survival recommendation",()=>{const x=JSON.parse(JSON.stringify(base));x.forestry.survivingTrees=5000;assert(buildScorecards(x).recommendations.some(r=>r.area==="forestry"));});
test("low occupancy recommendation",()=>{const x=JSON.parse(JSON.stringify(base));x.apiary.activeColonies=3;assert(buildScorecards(x).recommendations.some(r=>r.area==="apiary"));});
test("negative apiary proxy finding",()=>{const x=JSON.parse(JSON.stringify(base));x.apiary.honeySalesUGX=100;x.apiary.apiaryCostsUGX=500;assert(buildScorecards(x).findings.some(f=>f.area==="finance"&&f.level==="attention"));});
test("excess reinvestment finding",()=>{const x=JSON.parse(JSON.stringify(base));x.finance.reinvestmentUGX=999999;assert(buildScorecards(x).findings.some(f=>f.message.includes("reinvestment exceeds")));});
test("required inputs enforced",()=>assert.strictEqual(buildScorecards({}).status,"invalid_input"));
test("surviving trees cannot exceed planted",()=>{const x=JSON.parse(JSON.stringify(base));x.forestry.survivingTrees=8000;assert(buildScorecards(x).errors.some(e=>e.includes("cannot exceed")));});
test("colonies cannot exceed hives",()=>{const x=JSON.parse(JSON.stringify(base));x.apiary.activeColonies=11;assert(buildScorecards(x).errors.some(e=>e.includes("cannot exceed")));});
test("negative values rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.apiary.honeyKg=-1;assert(buildScorecards(x).errors.some(e=>e.includes("non-negative")));});
test("infinite values rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.forestry.treesPlanted=Infinity;assert(buildScorecards(x).errors.some(e=>e.includes("finite non-negative")));});
test("zero denominators null",()=>{const r=buildScorecards({forestry:{plantedAcres:0,treesPlanted:0,survivingTrees:0},apiary:{hives:0,activeColonies:0}});assert.strictEqual(r.scorecards.forestry.treeSurvivalPct,null);assert.strictEqual(r.scorecards.apiary.colonyOccupancyPct,null);});
test("missing forecast period warning",()=>{const x=JSON.parse(JSON.stringify(base));x.forestry.harvestForecast=[{volumeM3:2}];assert(buildScorecards(x).warnings.length>0);});
test("optional datasets default",()=>assert.strictEqual(buildScorecards({forestry:{plantedAcres:1,treesPlanted:0,survivingTrees:0},apiary:{hives:0,activeColonies:0}}).status,"ok"));
test("limitations explain proxy",()=>assert(buildScorecards(base).limitations.some(s=>s.includes("not audited profit"))));
test("all scorecard areas present",()=>{const s=buildScorecards(base).scorecards;assert(s.forestry&&s.apiary&&s.finance);});
test("recommendations always an array",()=>assert(Array.isArray(buildScorecards(base).recommendations)));
test("serialized report avoids NaN",()=>assert(!JSON.stringify(buildScorecards(base)).includes("NaN")));
console.log(`\nPhase 139 contract tests: ${passed} passed`);
if(passed!==31)process.exitCode=1;
