import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GrowerContract, HarvestLot, LotSale } from './harvest-intake.schema';
import { HarvestGlService } from './harvest-intake-gl.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

export type CreateHarvestLotInput = {
  lotCode: string;
  sourceType: 'own_farm' | 'grower';
  blockId: string;
  growerContractId?: string;
  harvestDate: string;
  commodityType: 'timber' | 'honey' | 'other';
  unit: string;
  quantity: number;
  unitCostUgx: number;
  grade?: string;
  qualityNotes?: string;
};

export type CreateSaleInput = {
  lotId: string;
  saleCode: string;
  saleDate: string;
  quantitySold: number;
  unitPriceUgx: number;
  buyerName?: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
};

@Injectable()
export class HarvestService {
  constructor(
    @InjectModel(GrowerContract.name) private contracts: Model<GrowerContract>,
    @InjectModel(HarvestLot.name) private lots: Model<HarvestLot>,
    @InjectModel(LotSale.name) private sales: Model<LotSale>,
    private readonly gl: HarvestGlService,
  ) {}

  async createLot(
    rawContext: OrganizationContext,
    input: CreateHarvestLotInput,
    actor: string,
  ): Promise<HarvestLot> {
    const context = requireOrganizationContext(rawContext);
    if (!input.quantity || input.quantity <= 0) throw new BadRequestException('quantity must be > 0');
    if (!input.unitCostUgx || input.unitCostUgx < 0) throw new BadRequestException('unitCostUgx must be >= 0');

    // Validate grower contract if source is grower
    let contract: GrowerContract | null = null;
    if (input.sourceType === 'grower') {
      if (!input.growerContractId) throw new BadRequestException('growerContractId required for grower source');
      contract = await this.contracts.findOne(
        organizationFilter(context, { _id: input.growerContractId }),
      );
      if (!contract) throw new NotFoundException('Grower contract not found');
      if (contract.status !== 'active') throw new BadRequestException(`Contract ${contract.contractCode} is ${contract.status}, not active`);
    }

    const lot = await this.lots.create(
      organizationDocument(context, {
        lotCode: input.lotCode,
        sourceType: input.sourceType,
        blockId: input.blockId,
        growerContractId: input.growerContractId ? new Types.ObjectId(input.growerContractId) : undefined,
        harvestDate: new Date(input.harvestDate),
        commodityType: input.commodityType,
        unit: input.unit,
        quantity: input.quantity,
        originalQuantity: input.quantity,
        unitCostUgx: input.unitCostUgx,
        grade: input.grade,
        qualityNotes: input.qualityNotes,
        status: 'in_stock',
        createdBy: actor,
      }),
    );

    // Post to GL
    if (input.sourceType === 'own_farm') {
      await this.gl.postOwnFarmHarvest(context, lot.toObject());
    } else {
      await this.gl.postGrowerHarvest(context, lot.toObject());
    }

    return lot.toObject();
  }

  async createSale(
    rawContext: OrganizationContext,
    input: CreateSaleInput,
    actor: string,
  ): Promise<LotSale> {
    const context = requireOrganizationContext(rawContext);

    const lot = await this.lots.findOne(organizationFilter(context, { _id: input.lotId }));
    if (!lot) throw new NotFoundException('Lot not found');
    if (lot.quantity < input.quantitySold) {
      throw new BadRequestException(`Only ${lot.quantity} ${lot.unit} available, cannot sell ${input.quantitySold}`);
    }
    if (!input.quantitySold || input.quantitySold <= 0) throw new BadRequestException('quantitySold must be > 0');
    if (!input.unitPriceUgx || input.unitPriceUgx < 0) throw new BadRequestException('unitPriceUgx must be >= 0');

    const totalRevenue = input.quantitySold * input.unitPriceUgx;
    const costBasis = input.quantitySold * lot.unitCostUgx;
    const grossMargin = totalRevenue - costBasis;

    const sale = await this.sales.create(
      organizationDocument(context, {
        lotId: lot._id,
        saleCode: input.saleCode,
        saleDate: new Date(input.saleDate),
        quantitySold: input.quantitySold,
        unitPriceUgx: input.unitPriceUgx,
        totalRevenueUgx: totalRevenue,
        costBasisUgx: costBasis,
        grossMarginUgx: grossMargin,
        buyerName: input.buyerName,
        paymentStatus: input.paymentStatus,
        createdBy: actor,
      }),
    );

    // Reduce lot quantity
    const newQty = lot.quantity - input.quantitySold;
    const newStatus = newQty === 0 ? 'sold_out' : 'partially_sold';
    await this.lots.updateOne(
      { _id: lot._id },
      { $set: { quantity: newQty, status: newStatus } },
    );

    // Post to GL
    await this.gl.postSale(context, sale.toObject(), lot.toObject());

    return sale.toObject();
  }

  async listLots(rawContext: OrganizationContext): Promise<HarvestLot[]> {
    const context = requireOrganizationContext(rawContext);
    return this.lots.find(organizationFilter(context)).sort({ harvestDate: -1 }).lean();
  }

  async listSales(rawContext: OrganizationContext): Promise<LotSale[]> {
    const context = requireOrganizationContext(rawContext);
    return this.sales.find(organizationFilter(context)).sort({ saleDate: -1 }).lean();
  }

  async listContracts(rawContext: OrganizationContext): Promise<GrowerContract[]> {
    const context = requireOrganizationContext(rawContext);
    return this.contracts.find(organizationFilter(context)).sort({ startDate: -1 }).lean();
  }

  async createContract(
    rawContext: OrganizationContext,
    input: Partial<GrowerContract>,
    actor: string,
  ): Promise<GrowerContract> {
    const context = requireOrganizationContext(rawContext);
    const created = await this.contracts.create(
      organizationDocument(context, { ...input, createdBy: actor }),
    );
    return created.toObject();
  }
}