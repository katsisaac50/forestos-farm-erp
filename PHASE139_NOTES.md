# Phase 139 — Forestry & Apiary Performance Scorecards

## Purpose
An offline analytics module that turns supplied forestry, apiary, and reinvestment figures into an executive scorecard.

## Metrics
- Forestry: tree survival, trees per planted acre, maintenance cost per acre, recorded forestry sales, and harvest forecast volume.
- Apiary: occupied/unoccupied hives, colony occupancy, honey per active colony, revenue per kg, recorded costs, and a gross-margin proxy.
- Finance: combined recorded sales/costs, operating-surplus proxy, and reinvestment comparison.
- Rule-based findings flag low survival, low occupancy, negative apiary proxy, and reinvestment above recorded surplus.

## Example input
```json
{
  "forestry": {
    "plantedAcres": 7, "treesPlanted": 7000, "survivingTrees": 6500,
    "seedlingsPlanted": 500, "maintenanceCostUGX": 210000, "salesUGX": 100000,
    "harvestForecast": [{"period": "2031-Q1", "volumeM3": 120}]
  },
  "apiary": {"hives": 10, "activeColonies": 7, "honeyKg": 42, "honeySalesUGX": 420000, "apiaryCostsUGX": 120000},
  "finance": {"reinvestmentUGX": 150000}
}
```

## Run
`node scripts/phase139-forestry-apiary-scorecards.js --input=path/to/data.json`
Add `--output=path/to/scorecard.json` to write a report file.
Run contract tests: `node scripts/phase139-forestry-apiary-scorecards-contract-tests.js`.

## Limitations
Standalone/offline JSON analytics only: no live farm, database, GIS, sensors, accounting integrations, visual dashboard, or access control. The gross-margin and operating-surplus values are proxies, not audited profit, and exclude costs not supplied (such as labor, capex, depreciation, taxes, overhead). Thresholds are planning signals, not universal standards. Forecast volumes are not harvest approvals; confirm stand age, inventory, permits, access, market, and management plan first.
