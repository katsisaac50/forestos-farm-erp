import { Injectable, Logger } from '@nestjs/common';
import { PostingService } from '../accounting/posting.service';
import { OrganizationContext } from '../organizations/organization-context';

@Injectable()
export class MaintenanceGlService {
  private readonly logger = new Logger(MaintenanceGlService.name);

  constructor(private readonly posting: PostingService) {}

  /** Capitalise an asset purchase — Dr PP&E or Tools / Cr Cash */
  async postAssetPurchase(
    context: OrganizationContext,
    asset: any,
  ): Promise<void> {
    if (!asset.purchaseCostUgx || asset.purchaseCostUgx <= 0) return;

    const debitAccount = this.accountForAssetType(asset.assetType);

    await this.posting.post(context, {
      date: asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(),
      description: `Asset purchase: ${asset.assetCode} — ${asset.name}`,
      sourceType: 'FarmAsset',
      sourceId: String(asset._id),
      createdBy: asset.createdBy,
      lines: [
        { accountCode: debitAccount, debit: asset.purchaseCostUgx, memo: `${asset.name} (${asset.assetType})` },
        { accountCode: '1000', credit: asset.purchaseCostUgx, memo: `Payment for ${asset.assetCode}` },
      ],
    });

    this.logger.log(`Posted asset purchase GL: ${asset.assetCode} ${asset.purchaseCostUgx} UGX`);
  }

  /** Complete a maintenance record — Dr Repair Expense / Cr Cash */
  async postMaintenanceCompletion(
    context: OrganizationContext,
    record: any,
    asset: any,
  ): Promise<void> {
    const total =
      (record.labourCostUgx || 0) +
      (record.partsCostUgx || 0) +
      (record.otherCostUgx || 0);

    if (total <= 0) return;

    await this.posting.post(context, {
      date: record.completedDate ? new Date(record.completedDate) : new Date(),
      description: `Maintenance: ${record.maintenanceCode} — ${record.title}`,
      sourceType: 'MaintenanceRecord',
      sourceId: String(record._id),
      createdBy: record.createdBy,
      lines: [
        { accountCode: '6220', debit: total, memo: `${record.maintenanceType}: ${asset?.name ?? record.assetId}` },
        { accountCode: '1000', credit: total, memo: `Maintenance payment for ${record.maintenanceCode}` },
      ],
    });

    this.logger.log(`Posted maintenance GL: ${record.maintenanceCode} ${total} UGX`);
  }

  /** Spare part stock increase — Dr Inventory: Supplies / Cr Cash */
  async postPartStockIncrease(
    context: OrganizationContext,
    part: any,
    quantityIncrease: number,
    actor: string,
  ): Promise<void> {
    if (quantityIncrease <= 0) return;
    const value = quantityIncrease * (part.unitCostUgx || 0);
    if (value <= 0) return;

    await this.posting.post(context, {
      date: new Date(),
      description: `Spare part stock increase: ${part.partCode} +${quantityIncrease} ${part.unit}`,
      sourceType: 'SparePartAdjustment',
      sourceId: `${part._id}:adjustment:${Date.now()}`,
      createdBy: actor,
      lines: [
        { accountCode: '1230', debit: value, memo: `${part.name} +${quantityIncrease}` },
        { accountCode: '1000', credit: value, memo: `Purchase of ${part.partCode}` },
      ],
    });
  }

  private accountForAssetType(assetType: string): string {
    switch (assetType) {
      case 'hand_tool':
      case 'power_tool':
      case 'safety_equipment':
        return '6200';   // Tools & Equipment (expense)
      case 'vehicle':
      case 'water_system':
      case 'building':
      case 'apiary_equipment':
      case 'other':
      default:
        return '1400';   // PPE: Equipment (asset)
    }
  }
}