import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';

@Controller('finance')
@Roles('owner')
export class FinanceController {
  constructor(
    private readonly service: FinanceService,
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

  @Get()
  async all(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.findAll(await this.context(req, organizationId));
  }

  @Post()
  async create(
    @Body() dto: CreateFinanceDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.create(dto, await this.context(req, organizationId), this.actor(req));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFinanceDto>,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.update(id, dto, await this.context(req, organizationId), this.actor(req));
  }
}
