import { Injectable, Logger } from '@nestjs/common';
import { PostingService } from '../accounting/posting.service';
import { OrganizationContext } from '../organizations/organization-context';

@Injectable()
export class ProcurementGlService {
  private readonly logger = new Logger(ProcurementGlService.name);

  constructor(private readonly posting: PostingService) {}

  async postReceipt(
    context: OrganizationContext,
    receipt: any,
    receiptLines: any[],
    orderLines: any[],
  ): Promise<void> {
    if (receipt.status === 'rejected') return;

    const lineMap = new Map(orderLines.map(l => [String(l._id), l]));
    const total = receiptLines.reduce((s, rl) => {
      const ol = lineMap.get(String(rl.orderLineId));
      return s + (rl.quantityReceived * (ol?.unitPriceUgx ?? 0));
    }, 0);

    if (total <= 0) return;

    const debitAccount = this.accountForReceiptLines(receiptLines, orderLines);

    await this.posting.post(context, {
      date: new Date(receipt.receivedDate),
      description: `Goods receipt: ${receipt.receiptCode}`,
      sourceType: 'GoodsReceipt',
      sourceId: String(receipt._id),
      createdBy: receipt.createdBy || 'system',
      lines: [
        { accountCode: debitAccount, debit: total, memo: `Received ${receiptLines.length} line(s)` },
        { accountCode: '2000', credit: total, memo: `Payable for ${receipt.receiptCode}` },
      ],
    });

    this.logger.log(`Posted GL for receipt ${receipt.receiptCode}: ${total} UGX`);
  }

  private accountForReceiptLines(receiptLines: any[], orderLines: any[]): string {
    const lineMap = new Map(orderLines.map(l => [String(l._id), l]));
    const codes = new Set(receiptLines.map(rl => {
      const ol = lineMap.get(String(rl.orderLineId));
      return this.accountForItem(ol?.itemName ?? '', ol?.itemCode ?? '');
    }));
    if (codes.size === 1) return [...codes][0];
    return '1230';
  }

  private accountForItem(itemName: string, itemCode: string): string {
    const t = `${itemName} ${itemCode}`.toLowerCase();
    if (/seedling|sapling|nursery|plant/.test(t)) return '1200';
    if (/honey|jar|bottle/.test(t)) return '1210';
    if (/fuel|diesel|petrol|benzene/.test(t)) return '6210';
    if (/tool|equipment|machinery|chainsaw/.test(t)) return '6200';
    if (/fertilis|fertiliz|chemical|herbicide|pesticide|dung|compost/.test(t)) return '6110';
    return '1230';
  }
}