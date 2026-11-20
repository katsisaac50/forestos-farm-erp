import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PostingService } from '../accounting/posting.service';
import { GrowerContract, HarvestLot, LotSale } from './harvest-intake.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

@Injectable()
export class HarvestGlService {
  private readonly logger = new Logger(HarvestGlService.name);

  constructor(
    private readonly posting: PostingService,
    @InjectModel(HarvestLot.name) private lots: Model<HarvestLot>,
    @InjectModel(LotSale.name) private sales: Model<LotSale>,
    @InjectModel(GrowerContract.name) private contracts: Model<GrowerContract>,
  ) {}

  /** Post: harvest received from own farm → inventory */
  async postOwnFarmHarvest(
    context: OrganizationContext,
    lot: HarvestLot,
    biologicalAssetAccountCode = '1300',   // Biological Assets: Growing Trees
    inventoryAccountCode = '1220',         // Inventory: Timber
  ): Promise<void> {
    const ctx = requireOrganizationContext(context);
    const totalCost = lot.originalQuantity * lot.unitCostUgx;

    const entry = await this.posting.post(ctx, {
      date: new Date(lot.harvestDate),
      description: `Harvest intake: ${lot.lotCode} from block ${lot.blockId}`,
      sourceType: 'HarvestLot',
      sourceId: String(lot._id),
      createdBy: lot.createdBy,
      lines: [
        { accountCode: inventoryAccountCode, debit: totalCost, memo: `${lot.originalQuantity} ${lot.unit} @ ${lot.unitCostUgx}` },
        { accountCode: biologicalAssetAccountCode, credit: totalCost, memo: `Harvest from ${lot.blockId}` },
      ],
    });
    await this.lots.updateOne({ _id: lot._id }, { $set: { journalEntryId: entry._id } });
  }

  /** Post: harvest received from grower → inventory + payable */
  async postGrowerHarvest(
    context: OrganizationContext,
    lot: HarvestLot,
    inventoryAccountCode = '1220',
    payableAccountCode = '2000',   // Accounts Payable
  ): Promise<void> {
    const ctx = requireOrganizationContext(context);
    const totalCost = lot.originalQuantity * lot.unitCostUgx;

    const entry = await this.posting.post(ctx, {
      date: new Date(lot.harvestDate),
      description: `Grower harvest intake: ${lot.lotCode} from ${lot.blockId}`,
      sourceType: 'HarvestLot',
      sourceId: String(lot._id),
      createdBy: lot.createdBy,
      lines: [
        { accountCode: inventoryAccountCode, debit: totalCost, memo: `${lot.originalQuantity} ${lot.unit} @ ${lot.unitCostUgx}` },
        { accountCode: payableAccountCode, credit: totalCost, memo: `Payable to grower for ${lot.lotCode}` },
      ],
    });
    await this.lots.updateOne({ _id: lot._id }, { $set: { journalEntryId: entry._id } });
  }

  /** Post: sale of a lot → revenue + COGS */
  async postSale(
    context: OrganizationContext,
    sale: LotSale,
    lot: HarvestLot,
  ): Promise<void> {
    const ctx = requireOrganizationContext(context);
    const inventoryAccountCode = '1220';
    const revenueAccountCode = lot.commodityType === 'honey' ? '4010' : '4000';
    const cogsAccountCode = lot.commodityType === 'honey' ? '5010' : '5000';

    // If paymentStatus is 'paid', debit Cash/Bank. If 'pending', debit AR.
    const paymentAccountCode = sale.paymentStatus === 'paid' ? '1000' : '1100'; // Cash or AR
    // In a real system you'd pull the payment method — for now default to AR if not paid

    const lines = [
      { accountCode: paymentAccountCode, debit: sale.totalRevenueUgx, memo: `Sale ${sale.saleCode}${sale.buyerName ? ' to ' + sale.buyerName : ''}` },
      { accountCode: revenueAccountCode, credit: sale.totalRevenueUgx, memo: `${sale.quantitySold} ${lot.unit} @ ${sale.unitPriceUgx}` },
      { accountCode: cogsAccountCode, debit: sale.costBasisUgx, memo: `COGS for ${sale.saleCode}` },
      { accountCode: inventoryAccountCode, credit: sale.costBasisUgx, memo: `Inventory reduction for ${sale.saleCode}` },
    ];

    const entry = await this.posting.post(ctx, {
      date: new Date(sale.saleDate),
      description: `Lot sale: ${sale.saleCode} from ${lot.lotCode}`,
      sourceType: 'LotSale',
      sourceId: String(sale._id),
      createdBy: sale.createdBy,
      lines,
    });
    await this.sales.updateOne({ _id: sale._id }, { $set: { journalEntryId: entry._id } });
  }

  /** Post: advance payment to grower */
  async postGrowerAdvance(
    context: OrganizationContext,
    contract: GrowerContract,
    amount: number,
    actor: string,
  ): Promise<void> {
    const ctx = requireOrganizationContext(context);
    await this.posting.post(ctx, {
      date: new Date(),
      description: `Grower advance: ${contract.contractCode} — ${contract.growerName}`,
      sourceType: 'GrowerAdvance',
      sourceId: `${contract._id}:advance:${Date.now()}`,
      createdBy: actor,
      lines: [
        { accountCode: '2000', debit: amount, memo: `Advance to ${contract.growerName}` },   // reduce payable
        { accountCode: '1010', credit: amount, memo: `Cash advance` },
      ],
    });
  }
}