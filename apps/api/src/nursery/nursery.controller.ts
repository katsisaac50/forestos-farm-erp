import { BadRequestException, Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { NurseryService } from './nursery.service';

@Roles('owner')
@Controller('nursery')
export class NurseryController {
  constructor(
    private readonly service: NurseryService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id');
    return this.organizationAccess.resolveContext(userId, organizationId);
  }

  @Get('dashboard')
  async dashboard(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.dashboard(await this.context(req, orgId));
  }

  @Get('batches')
  async batches(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.listBatches(await this.context(req, orgId));
  }

  @Post('batches')
  async createBatch(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.createBatch(body, req.user, await this.context(req, orgId));
  }

  @Get('movements')
  async movements(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query('batchId') batchId?: string) {
    return this.service.listMovements(await this.context(req, orgId), batchId);
  }

  @Post('movements')
  async movement(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.addMovement(body, req.user, await this.context(req, orgId));
  }
}