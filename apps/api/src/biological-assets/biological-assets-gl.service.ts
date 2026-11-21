import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostingService } from '../accounting/posting.service';
import { BiologicalAsset, BiologicalValuation } from './biological-assets.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';

@Injectable()
export class BiologicalAssetsGlService {
  private readonly logger = new Logger(BiologicalAssetsGlService.name);

  constructor(
    private readonly posting: PostingService,
    @InjectModel(BiologicalAsset.name) private assets: Model<BiologicalAsset>,
    @InjectModel(BiologicalValuation.name) private valuations: Model<BiologicalValuation>,
  ) {}

  /**
   * Post a revaluation. If gain (positive), Dr Biological Assets / Cr Revaluation Gain (revenue).
   * If loss (negative), Dr Revaluation Loss (expense) / Cr Biological Assets.
   */

  // In BiologicalAssetsGlService:
async postCapitalisation(
  context: OrganizationContext,
  asset: BiologicalAsset,
  actor: string,
): Promise<void> {
  const ctx = requireOrganizationContext(context);
  await this.posting.post(ctx, {
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

  async postValuation(
    context: OrganizationContext,
    valuation: BiologicalValuation,
  ): Promise<void> {
    const ctx = requireOrganizationContext(context);
    if (valuation.gainLossUgx === 0) return;   // no-op

    const lines = valuation.gainLossUgx > 0
      ? [
          { accountCode: '1300', debit: valuation.gainLossUgx, memo: `Revaluation gain: ${valuation.blockId}` },
          { accountCode: '4030', credit: valuation.gainLossUgx, memo: `Growth revaluation: ${valuation.blockId}` },
        ]
      : [
          { accountCode: '6320', debit: Math.abs(valuation.gainLossUgx), memo: `Revaluation loss: ${valuation.blockId}` },
          { accountCode: '1300', credit: Math.abs(valuation.gainLossUgx), memo: `Impairment: ${valuation.blockId}` },
        ];

    const entry = await this.posting.post(ctx, {
      date: new Date(valuation.valuationDate),
      description: `Biological asset revaluation: ${valuation.blockId}`,
      sourceType: 'BiologicalValuation',
      sourceId: String(valuation._id),
      createdBy: valuation.createdBy,
      lines,
    });

    await this.valuations.updateOne(
      { _id: valuation._id },
      { $set: { journalEntryId: entry._id } },
    );
  }
}