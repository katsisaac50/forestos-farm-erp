import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { RegenerationService } from './regeneration.service';

@Roles('owner')
@Controller('regeneration')
export class RegenerationController {
  constructor(
    private readonly service: RegenerationService,
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

  @Get('plans')
  async plans(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.listPlans(await this.context(req, orgId));
  }

  @Post('plans')
  async createPlan(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.createPlan(body, req.user, await this.context(req, orgId));
  }

  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.updatePlan(id, body, req.user, await this.context(req, orgId));
  }

  @Get('costs')
  async costs(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query('planId') planId?: string) {
    return this.service.listCosts(await this.context(req, orgId), planId);
  }

  @Post('costs')
  async createCost(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.createCost(body, req.user, await this.context(req, orgId));
  }

  @Get('survival-checks')
  async checks(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query('planId') planId?: string) {
    return this.service.listChecks(await this.context(req, orgId), planId);
  }

  @Post('survival-checks')
  async createCheck(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.createCheck(body, req.user, await this.context(req, orgId));
  }
}