import { Injectable, Logger } from '@nestjs/common';
import { PostingService } from '../accounting/posting.service';
import { OrganizationContext } from '../organizations/organization-context';

@Injectable()
export class NurseryGlService {
  private readonly logger = new Logger(NurseryGlService.name);

  constructor(private readonly posting: PostingService) {}

  async postMovement(
    context: OrganizationContext,
    movement: any,
    batch: any,
  ): Promise<void> {
    const unitCost = Number(batch.unitCostUgx || 0);
    const value = movement.quantity * unitCost;
    if (value <= 0) return;

    const lines = this.linesForMovement(movement, value);
    if (!lines || lines.length === 0) return;

    await this.posting.post(context, {
      date: new Date(movement.movementDate),
      description: `Nursery ${movement.movementType}: ${batch.batchCode} ${movement.quantity} ${batch.speciesOrClone}`,
      sourceType: 'NurseryMovement',
      sourceId: String(movement._id),
      createdBy: movement.recordedBy || 'system',
      lines,
    });

    this.logger.log(
      `Posted nursery GL: ${batch.batchCode} ${movement.movementType} ${value} UGX`,
    );
  }

  private linesForMovement(
    movement: any,
    value: number,
  ): Array<{ accountCode: string; debit?: number; credit?: number; memo?: string }> {
    const memo = `${movement.movementType}: ${movement.quantity} seedlings`;

    switch (movement.movementType) {
      case 'production_added':
        // Dr Inventory: Seedlings / Cr Owner's Capital (opening stock capitalisation)
        return [
          { accountCode: '1200', debit: value, memo },
          { accountCode: '3000', credit: value, memo: 'Seedling batch capitalisation' },
        ];

      case 'loss':
        // Dr Seedlings & Planting Expense / Cr Inventory: Seedlings
        return [
          { accountCode: '6100', debit: value, memo: `Loss: ${movement.quantity} seedlings` },
          { accountCode: '1200', credit: value, memo },
        ];

      case 'dispatch':
        // Dr Biological Assets / Cr Inventory: Seedlings (transfer to field)
        return [
          { accountCode: '1300', debit: value, memo: `Dispatched to ${movement.plantationBlockId || 'field'}` },
          { accountCode: '1200', credit: value, memo },
        ];

      case 'adjustment_in':
        // Dr Inventory: Seedlings / Cr Inventory Adjustment Gain
        return [
          { accountCode: '1230', debit: value, memo },
          { accountCode: '4040', credit: value, memo: 'Nursery adjustment increase' },
        ];

      case 'adjustment_out':
        // Dr Inventory Adjustment Loss / Cr Inventory: Seedlings
        return [
          { accountCode: '6230', debit: value, memo: `Nursery adjustment decrease` },
          { accountCode: '1200', credit: value, memo },
        ];

      default:
        this.logger.warn(`Unknown nursery movement type ${movement.movementType}`);
        return [];
    }
  }
}