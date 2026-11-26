import { Injectable, Logger } from '@nestjs/common';
import { PostingService } from '../accounting/posting.service';
import { OrganizationContext } from '../organizations/organization-context';

@Injectable()
export class RegenerationGlService {
  private readonly logger = new Logger(RegenerationGlService.name);

  constructor(private readonly posting: PostingService) {}

  async postCost(
    context: OrganizationContext,
    cost: any,
    plan: any,
  ): Promise<void> {
    if (!cost.amountUgx || cost.amountUgx <= 0) return;

    await this.posting.post(context, {
      date: new Date(cost.date),
      description: `Regeneration cost: ${cost.category} — ${plan?.planName ?? cost.planId}`,
      sourceType: 'RegenerationCost',
      sourceId: String(cost._id),
      createdBy: cost.createdBy || 'system',
      lines: [
        {
          accountCode: '1300',
          debit: cost.amountUgx,
          memo: `${cost.category}${cost.description ? ': ' + cost.description : ''}`,
        },
        {
          accountCode: '1000',
          credit: cost.amountUgx,
          memo: `Payment for ${cost.category}`,
        },
      ],
    });

    this.logger.log(
      `Posted regeneration GL: ${cost.category} ${cost.amountUgx} UGX for ${plan?.planName ?? cost.planId}`,
    );
  }
}