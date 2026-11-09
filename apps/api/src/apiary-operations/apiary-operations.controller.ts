import { BadRequestException, Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { ApiaryOperationsService } from './apiary-operations.service';

@Controller('apiary-operations')
export class ApiaryOperationsController {
  constructor(
    private readonly operations: ApiaryOperationsService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(userId, organizationId);
  }

  @Get('inspections')
  async listInspections(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
    @Query('hiveId') hiveId?: string,
  ) {
    return this.operations.listInspections(await this.context(req, organizationId), hiveId);
  }

  @Post('inspections')
  async createInspection(
    @Body() body: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const context = await this.context(req, organizationId);
    return this.operations.createInspection(body, context, req.user?.email || context.userId);
  }

  @Get('harvests')
  async listHarvests(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
    @Query('hiveId') hiveId?: string,
  ) {
    return this.operations.listHarvests(await this.context(req, organizationId), hiveId);
  }

  @Post('harvests')
  async createHarvest(
    @Body() body: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const context = await this.context(req, organizationId);
    return this.operations.createHarvest(body, context, req.user?.email || context.userId);
  }

  @Get('harvest-summary')
  async harvestSummary(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.operations.summary(await this.context(req, organizationId));
  }
}
