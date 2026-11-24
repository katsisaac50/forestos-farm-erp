import { Injectable, Logger } from '@nestjs/common';
import { PostingService } from '../accounting/posting.service';
import { OrganizationContext } from '../organizations/organization-context';

@Injectable()
export class InventoryControlGlService {
  private readonly logger = new Logger(InventoryControlGlService.name);

  constructor(private readonly posting: PostingService) {}

  async postMovement(
    context: OrganizationContext,
    movement: any,
    item: any,
  ): Promise<void> {
    const value = movement.quantity * movement.unitCostUgx;
    if (value <= 0) return;

    const inventoryAccount = this.inventoryAccountFor(item.category);
    const lines = this.linesForMovement(movement, item, value, inventoryAccount);
    if (!lines || lines.length === 0) return;

    await this.posting.post(context, {
      date: new Date(movement.movementDate),
      description: `Stock ${movement.movementType}: ${item.itemCode} ${movement.quantity} ${item.unit}`,
      sourceType: 'StockMovement',
      sourceId: String(movement._id),
      createdBy: movement.createdBy || 'system',
      lines,
    });

    this.logger.log(
      `Posted inventory GL: ${item.itemCode} ${movement.movementType} ${value} UGX`,
    );
  }

  private linesForMovement(
    movement: any,
    item: any,
    value: number,
    inventoryAccount: string,
  ): Array<{ accountCode: string; debit?: number; credit?: number; memo?: string }> {
    const memo = `${movement.movementType}: ${item.name}`;

    switch (movement.movementType) {
      case 'opening_balance':
        return [
          { accountCode: inventoryAccount, debit: value, memo },
          { accountCode: '3000', credit: value, memo: 'Initial stock capitalisation' },
        ];

      case 'receipt':
        return [
          { accountCode: inventoryAccount, debit: value, memo },
          { accountCode: '2000', credit: value, memo: `Purchase of ${item.name}` },
        ];

      case 'issue':
        return [
          { accountCode: this.expenseAccountFor(item.category), debit: value, memo },
          { accountCode: inventoryAccount, credit: value, memo: `Issued ${item.name}` },
        ];

      case 'return':
        return [
          { accountCode: inventoryAccount, debit: value, memo },
          { accountCode: this.expenseAccountFor(item.category), credit: value, memo: `Return of ${item.name}` },
        ];

      case 'adjustment_increase':
        return [
          { accountCode: inventoryAccount, debit: value, memo },
          { accountCode: '4040', credit: value, memo: `Adjustment increase: ${item.name}` },
        ];

      case 'adjustment_decrease':
        return [
          { accountCode: '6230', debit: value, memo: `Adjustment decrease: ${item.name}` },
          { accountCode: inventoryAccount, credit: value, memo },
        ];

      case 'write_off':
        return [
          { accountCode: '6230', debit: value, memo: `Write-off: ${item.name}` },
          { accountCode: inventoryAccount, credit: value, memo },
        ];

      default:
        this.logger.warn(`Unknown movement type ${movement.movementType} — skipping GL`);
        return [];
    }
  }

  private inventoryAccountFor(category: string): string {
    switch (category) {
      case 'seedlings': return '1200';
      case 'beekeeping': return '1210';
      default: return '1230';
    }
  }

  private expenseAccountFor(category: string): string {
    switch (category) {
      case 'seedlings': return '6100';
      case 'beekeeping': return '5010';
      case 'fuel': return '6210';
      case 'tools':
      case 'safety': return '6200';
      case 'spare_parts': return '6220';
      case 'fertiliser': return '6110';
      case 'packaging':
      case 'other':
      default: return '6900';
    }
  }
}