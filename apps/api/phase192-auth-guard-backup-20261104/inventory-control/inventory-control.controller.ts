import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { InventoryControlService } from './inventory-control.service';

@Controller('inventory-control')
@UseGuards(JwtAuthGuard)
@Roles('owner')
export class InventoryControlController {
  constructor(
    private readonly service: InventoryControlService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(userId, organizationId);
  }

  @Get('dashboard')
  async dashboard(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.dashboard(await this.context(req, orgId));
  }

  @Get('items')
  async items(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query() q: any = {}) {
    return this.service.listItems(await this.context(req, orgId), q);
  }

  @Post('items')
  async createItem(@Body() b: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const context = await this.context(req, orgId);
    return this.service.createItem(context, b, context.userId);
  }

  @Patch('items/:id')
  async updateItem(@Param('id') id: string, @Body() b: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.service.updateItem(await this.context(req, orgId), id, b);
  }

  @Get('movements')
  async movements(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query('itemId') id?: string) {
    return this.service.listMovements(await this.context(req, orgId), id);
  }

  @Post('movements')
  async movement(@Body() b: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const context = await this.context(req, orgId);
    return this.service.postMovement(context, b, context.userId);
  }
}
