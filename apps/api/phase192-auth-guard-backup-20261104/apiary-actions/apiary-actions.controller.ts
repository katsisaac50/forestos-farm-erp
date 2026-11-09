import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { ApiaryActionsService } from './apiary-actions.service';

@Controller('apiary-actions')
@UseGuards(JwtAuthGuard)
export class ApiaryActionsController {
  constructor(private readonly actions: ApiaryActionsService, private readonly organizationAccess: OrganizationAccessService) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(userId, organizationId);
  }

  @Get()
  async list(@Req() req: any, @Headers('x-organization-id') organizationId?: string, @Query() query?: any) {
    return this.actions.list(await this.context(req, organizationId), query || {});
  }

  @Get('summary')
  async summary(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.actions.summary(await this.context(req, organizationId));
  }

  @Get(':id/history')
  async history(@Param('id') id: string, @Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.actions.history(id, await this.context(req, organizationId));
  }

  @Post()
  async create(@Body() body: any, @Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    const context = await this.context(req, organizationId);
    return this.actions.create(body, context, req.user?.email || context.userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    const context = await this.context(req, organizationId);
    return this.actions.update(id, body, context, req.user?.email || context.userId);
  }
}
