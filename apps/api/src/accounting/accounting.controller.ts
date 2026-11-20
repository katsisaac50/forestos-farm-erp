import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { TrialBalanceService } from './trial-balance.service';
import { BackfillService } from './backfill.service';
import { FinancialReportsService } from './financial-reports.service';
import { PeriodsService } from './periods.service';
import { JournalEntriesService, ManualEntryInput } from './journal-entries.service';


@Controller('accounting')
@Roles('owner')
export class AccountingController {
  constructor(
    private readonly trialBalance: TrialBalanceService,
    private readonly backfill: BackfillService,
    private readonly reports: FinancialReportsService,
    private readonly periods: PeriodsService,
    private readonly journals: JournalEntriesService,   
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(String(userId), organizationId);
  }

  private actor(req: any): string {
  const user = req.user || {};
  return String(user.email || user.username || user.sub || 'unknown').toLowerCase();
}

@Get('journal-entries')
async listJournals(
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
  @Query('from') from?: string,
  @Query('to') to?: string,
) {
  return this.journals.list(
    await this.context(req, organizationId),
    from ? new Date(from) : undefined,
    to ? new Date(to + 'T23:59:59.999Z') : undefined,
  );
}

@Get('journal-entries/:id')
async getJournal(
  @Param('id') id: string,
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
) {
  return this.journals.detail(await this.context(req, organizationId), id);
}

@Post('journal-entries')
async createJournal(
  @Body() body: ManualEntryInput,
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
) {
  return this.journals.createManual(
    await this.context(req, organizationId),
    body,
    this.actor(req),
  );
}

@Post('journal-entries/:id/reverse')
async reverseJournal(
  @Param('id') id: string,
  @Body() body: { reason: string },
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
) {
  return this.journals.reverse(
    await this.context(req, organizationId),
    id,
    body.reason,
    this.actor(req),
  );
}

@Get('periods')
async listPeriods(
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
) {
  return this.periods.list(await this.context(req, organizationId));
}

@Post('periods/:year/:month/lock')
async lockPeriod(
  @Param('year') year: string,
  @Param('month') month: string,
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
) {
  return this.periods.lockPeriod(
    await this.context(req, organizationId),
    Number(year),
    Number(month),
    this.actor(req),
  );
}

@Post('periods/:id/reopen')
async reopenPeriod(
  @Param('id') id: string,
  @Body() body: { reason: string },
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
) {
  return this.periods.reopenPeriod(
    await this.context(req, organizationId),
    id,
    body.reason,
    this.actor(req),
  );
}

  @Get('reports/profit-and-loss')
async getProfitAndLoss(
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
  @Query('from') from?: string,
  @Query('to') to?: string,
) {
  if (!from || !to) throw new BadRequestException('from and to query params required (YYYY-MM-DD)');
  return this.reports.profitAndLoss(
    await this.context(req, organizationId),
    new Date(from),
    new Date(to + 'T23:59:59.999Z'),
  );
}

@Get('reports/balance-sheet')
async getBalanceSheet(
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
  @Query('asOf') asOf?: string,
) {
  if (!asOf) throw new BadRequestException('asOf query param required (YYYY-MM-DD)');
  return this.reports.balanceSheet(
    await this.context(req, organizationId),
    new Date(asOf + 'T23:59:59.999Z'),
  );
}

@Get('reports/cash-flow')
async getCashFlow(
  @Req() req: any,
  @Headers('x-organization-id') organizationId?: string,
  @Query('from') from?: string,
  @Query('to') to?: string,
) {
  if (!from || !to) throw new BadRequestException('from and to query params required (YYYY-MM-DD)');
  return this.reports.cashFlow(
    await this.context(req, organizationId),
    new Date(from),
    new Date(to + 'T23:59:59.999Z'),
  );
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