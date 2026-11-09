import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';
import { ApiaryInspection, HoneyHarvest } from '../apiary-operations/apiary-operation.schema';
import { Hive } from '../hives/hive.schema';

@Injectable()
export class ApiaryIntelligenceService {
  constructor(
    @InjectModel(ApiaryInspection.name) private inspections: Model<ApiaryInspection>,
    @InjectModel(HoneyHarvest.name) private harvests: Model<HoneyHarvest>,
    @InjectModel(Hive.name) private hives: Model<Hive>,
  ) {}

  async dashboard(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const [hives, inspections, harvests] = await Promise.all([
      this.hives.find(organizationFilter(context)).sort({ hiveId: 1 }).lean(),
      this.inspections.find(organizationFilter(context)).sort({ inspectionDate: -1 }).limit(5000).lean(),
      this.harvests.find(organizationFilter(context)).sort({ harvestDate: -1 }).limit(5000).lean(),
    ]);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    const recentInspections = inspections.filter((x: any) => new Date(x.inspectionDate) >= cutoff);
    const recentHarvests = harvests.filter((x: any) => new Date(x.harvestDate) >= cutoff);
    const totalHoneyKg = harvests.reduce((sum: number, row: any) => sum + Number(row.quantityKg || 0), 0);
    const healthCounts: Record<string, number> = { Strong: 0, Moderate: 0, Weak: 0, Queenless: 0, Unknown: 0 };
    for (const row of inspections as any[]) {
      const status = healthCounts[row.colonyStrength] === undefined ? 'Unknown' : row.colonyStrength;
      healthCounts[status] += 1;
    }
    const yieldByHive = new Map<string, number>();
    for (const row of harvests as any[]) yieldByHive.set(row.hiveId, (yieldByHive.get(row.hiveId) || 0) + Number(row.quantityKg || 0));
    const productivityRanking = [...yieldByHive.entries()]
      .map(([hiveId, quantityKg]) => ({ hiveId, recordedHoneyKg: Math.round(quantityKg * 100) / 100 }))
      .sort((a, b) => b.recordedHoneyKg - a.recordedHoneyKg);
    const latestInspectionByHive = new Map<string, any>();
    for (const row of inspections as any[]) if (!latestInspectionByHive.has(row.hiveId)) latestInspectionByHive.set(row.hiveId, row);
    const attentionHives = hives.map((hive: any) => {
      const latest = latestInspectionByHive.get(hive.hiveId);
      const reasons: string[] = [];
      if (hive.colonyStatus === 'Weak' || hive.colonyStatus === 'Queenless') reasons.push(`Hive status is ${hive.colonyStatus}`);
      if (!latest) reasons.push('No recorded apiary inspection');
      else {
        if (latest.colonyStrength === 'Weak' || latest.colonyStrength === 'Queenless') reasons.push(`Latest inspection indicates ${latest.colonyStrength.toLowerCase()} colony`);
        if (latest.actionRequired) reasons.push('Inspection has a recorded action required');
        if (latest.pestOrDiseaseLevel === 'High') reasons.push('High pest or disease level recorded');
      }
      return { hiveId: hive.hiveId, apiarySite: hive.apiarySite, latestInspectionDate: latest?.inspectionDate || null, reasons };
    }).filter((x: any) => x.reasons.length > 0);
    return {
      organizationId: context.organizationId,
      generatedAt: now.toISOString(),
      overview: {
        registeredHives: hives.length,
        inspectionRecords: inspections.length,
        inspectionsLast30Days: recentInspections.length,
        harvestRecords: harvests.length,
        harvestRecordsLast30Days: recentHarvests.length,
        totalRecordedHoneyKg: Math.round(totalHoneyKg * 100) / 100,
        recordedHoneyKgLast30Days: Math.round(recentHarvests.reduce((sum: number, row: any) => sum + Number(row.quantityKg || 0), 0) * 100) / 100,
      },
      inspectionHealthCounts: healthCounts,
      productivityRanking,
      hivesRequiringAttention: attentionHives,
      limitations: [
        'Insights use recorded data only; missing inspections do not prove poor colony health.',
        'Honey ranking is cumulative recorded kilograms, not normalized yield per hive-day or per colony strength.',
        'Attention flags are prompts for human review, not veterinary or apicultural diagnoses.',
      ],
    };
  }

  async productivity(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const harvests: any[] = await this.harvests.find(organizationFilter(context)).sort({ harvestDate: 1 }).limit(10000).lean();
    const byMonth = new Map<string, number>();
    const byHive = new Map<string, number>();
    for (const row of harvests) {
      const date = new Date(row.harvestDate);
      if (Number.isNaN(date.getTime())) continue;
      const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth.set(month, (byMonth.get(month) || 0) + Number(row.quantityKg || 0));
      byHive.set(row.hiveId, (byHive.get(row.hiveId) || 0) + Number(row.quantityKg || 0));
    }
    return {
      organizationId: context.organizationId,
      generatedAt: new Date().toISOString(),
      monthlyRecordedHoneyKg: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([month, quantityKg]) => ({ month, quantityKg: Math.round(quantityKg * 100) / 100 })),
      hiveTotals: [...byHive.entries()].sort((a, b) => b[1] - a[1])
        .map(([hiveId, quantityKg]) => ({ hiveId, quantityKg: Math.round(quantityKg * 100) / 100 })),
      note: 'Monthly totals are grouped by UTC month. They reflect recorded harvests only.',
    };
  }
}
