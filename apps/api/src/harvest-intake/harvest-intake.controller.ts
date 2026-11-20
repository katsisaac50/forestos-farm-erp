import { BadRequestException, Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { HarvestService, CreateHarvestLotInput, CreateSaleInput } from './harvest-intake.service';

@Controller('harvest-intake')
@Roles('owner')
export class HarvestIntakeController {
  constructor(
    private readonly service: HarvestService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id');
    return this.organizationAccess.resolveContext(String(userId), organizationId);
  }

  private actor(req: any): string {
    const user = req.user || {};
    return String(user.email || user.username || user.sub || 'unknown').toLowerCase();
  }

  @Get('lots')
  async listLots(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.listLots(await this.context(req, organizationId));
  }

  @Post('lots')
  async createLot(
    @Body() body: CreateHarvestLotInput,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.createLot(await this.context(req, organizationId), body, this.actor(req));
  }

  @Get('sales')
  async listSales(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.listSales(await this.context(req, organizationId));
  }

  @Post('sales')
  async createSale(
    @Body() body: CreateSaleInput,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.createSale(await this.context(req, organizationId), body, this.actor(req));
  }

  @Get('contracts')
  async listContracts(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.listContracts(await this.context(req, organizationId));
  }

  @Post('contracts')
  async createContract(
    @Body() body: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.createContract(await this.context(req, organizationId), body, this.actor(req));
  }
}