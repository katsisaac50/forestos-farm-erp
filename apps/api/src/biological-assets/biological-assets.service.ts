import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BiologicalAsset, BiologicalValuation } from './biological-assets.schema';
import { BiologicalAssetsGlService } from './biological-assets-gl.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

export type CreateAssetInput = {
  blockId: string;
  plantedDate: string;
  areaAcres: number;
  species: string;
  costBasisUgx: number;
  estimatedVolume: number;
  volumeUnit: string;
  fairValuePerUnitUgx: number;
};

export type CreateValuationInput = {
  blockId: string;
  valuationDate: string;
  estimatedVolume: number;
  fairValuePerUnitUgx: number;
  valuationMethod?: string;
  notes?: string;
};

@Injectable()
export class BiologicalAssetsService {
  constructor(
    @InjectModel(BiologicalAsset.name) private assets: Model<BiologicalAsset>,
    @InjectModel(BiologicalValuation.name) private valuations: Model<BiologicalValuation>,
    private readonly gl: BiologicalAssetsGlService,
  ) {}

  async list(rawContext: OrganizationContext): Promise<BiologicalAsset[]> {
    const context = requireOrganizationContext(rawContext);
    return this.assets.find(organizationFilter(context)).sort({ blockId: 1 }).lean();
  }

  async listValuations(rawContext: OrganizationContext, blockId?: string): Promise<BiologicalValuation[]> {
    const context = requireOrganizationContext(rawContext);
    const filter: Record<string, unknown> = {};
    if (blockId) filter.blockId = blockId;
    return this.valuations.find(organizationFilter(context, filter)).sort({ valuationDate: -1 }).limit(200).lean();
  }

  async createAsset(
    rawContext: OrganizationContext,
    input: CreateAssetInput,
    actor: string,
  ): Promise<BiologicalAsset> {
    const context = requireOrganizationContext(rawContext);
    const fairValue = input.estimatedVolume * input.fairValuePerUnitUgx;

    // 1. Create the asset record
    const asset = await this.assets.create(
      organizationDocument(context, {
        blockId: input.blockId,
        plantedDate: new Date(input.plantedDate),
        areaAcres: input.areaAcres,
        species: input.species,
        costBasisUgx: input.costBasisUgx,
        fairValueUgx: fairValue,
        estimatedVolume: input.estimatedVolume,
        volumeUnit: input.volumeUnit,
        fairValuePerUnitUgx: input.fairValuePerUnitUgx,
        createdBy: actor,
      }),
    );

    // 2. Post initial capitalisation + initial valuation
    // First: capitalise cost basis
    if (input.costBasisUgx > 0) {
      await this.gl.postCapitalisation(context, asset.toObject(), actor);
    }

    // Then: post initial fair value as a valuation (gain)
    if (fairValue > 0) {
      const valuation = await this.valuations.create(
        organizationDocument(context, {
          blockId: input.blockId,
          valuationDate: new Date(input.plantedDate),
          previousFairValueUgx: 0,
          newFairValueUgx: fairValue,
          gainLossUgx: fairValue,
          estimatedVolume: input.estimatedVolume,
          volumeUnit: input.volumeUnit,
          fairValuePerUnitUgx: input.fairValuePerUnitUgx,
          valuationMethod: 'market',
          notes: 'Initial valuation on capitalisation',
          createdBy: actor,
        }),
      );
      await this.gl.postValuation(context, valuation.toObject());

      await this.assets.updateOne(
        { _id: asset._id },
        { $set: { lastValuationDate: new Date(input.plantedDate), lastValuationBy: actor } },
      );
    }

    return this.assets.findById(asset._id).lean() as any;
  }

  async revalue(
    rawContext: OrganizationContext,
    input: CreateValuationInput,
    actor: string,
  ): Promise<BiologicalValuation> {
    const context = requireOrganizationContext(rawContext);
    const asset = await this.assets.findOne(organizationFilter(context, { blockId: input.blockId }));
    if (!asset) throw new NotFoundException(`Biological asset for block ${input.blockId} not found`);

    const newFairValue = input.estimatedVolume * input.fairValuePerUnitUgx;
    const previousFairValue = asset.fairValueUgx;
    const gainLoss = newFairValue - previousFairValue;

    const valuation = await this.valuations.create(
      organizationDocument(context, {
        blockId: input.blockId,
        valuationDate: new Date(input.valuationDate),
        previousFairValueUgx: previousFairValue,
        newFairValueUgx: newFairValue,
        gainLossUgx: gainLoss,
        estimatedVolume: input.estimatedVolume,
        volumeUnit: asset.volumeUnit,
        fairValuePerUnitUgx: input.fairValuePerUnitUgx,
        valuationMethod: input.valuationMethod ?? 'market',
        notes: input.notes,
        createdBy: actor,
      }),
    );

    // Post to GL if there's a change
    if (gainLoss !== 0) {
      await this.gl.postValuation(context, valuation.toObject());
    }

    // Update asset
    await this.assets.updateOne(
      { _id: asset._id },
      {
        $set: {
          fairValueUgx: newFairValue,
          estimatedVolume: input.estimatedVolume,
          fairValuePerUnitUgx: input.fairValuePerUnitUgx,
          lastValuationDate: new Date(input.valuationDate),
          lastValuationBy: actor,
        },
      },
    );

    return this.valuations.findById(valuation._id).lean() as any;
  }

  private async postCapitalisation(
    context: OrganizationContext,
    asset: BiologicalAsset,
    actor: string,
  ): Promise<void> {
    // Dr Biological Assets 1300 / Cr Owner's Capital 3000 (initial cost basis)
    // In a production system this would credit the actual source: Cash, AP, etc.
    // For a first-pass capitalisation, we credit Owner's Capital because the cost
    // was already incurred before the asset was put on the books.
    const ctx = requireOrganizationContext(context);
    await this.gl['posting'].post(ctx, {
      date: new Date(asset.plantedDate),
      description: `Capitalise biological asset: ${asset.blockId}`,
      sourceType: 'BiologicalAssetCapitalisation',
      sourceId: String(asset._id),
      createdBy: actor,
      lines: [
        { accountCode: '1300', debit: asset.costBasisUgx, memo: `Cost basis for ${asset.blockId}` },
        { accountCode: '3000', credit: asset.costBasisUgx, memo: `Capitalised into biological asset` },
      ],
    });
  }
}