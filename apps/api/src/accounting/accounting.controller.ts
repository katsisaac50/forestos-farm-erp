import { BadRequestException, Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { TrialBalanceService } from './trial-balance.service';
import { BackfillService } from './backfill.service';

@Controller('accounting')
@Roles('owner')
export class AccountingController {
  constructor(
    private readonly trialBalance: TrialBalanceService,
    private readonly backfill: BackfillService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(String(userId), organizationId);
  }

  @Get('trial-balance')
  async getTrialBalance(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.trialBalance.generate(
      await this.context(req, organizationId),
      fromDate,
      toDate,
    );
  }

  @Post('backfill')
  async runBackfill(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.backfill.backfill(await this.context(req, organizationId));
  }
}