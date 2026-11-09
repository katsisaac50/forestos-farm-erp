import { BadRequestException, Body, Controller, Get, Headers, Patch, Param, Post, Req } from '@nestjs/common';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { CreateHiveDto } from './dto';
import { HivesService } from './hives.service';

@Controller('hives')
export class HivesController {
  constructor(
    private readonly hives: HivesService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(userId, organizationId);
  }

  @Get()
  async all(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.hives.findAll(await this.context(req, organizationId));
  }

  @Post()
  async create(
    @Body() dto: CreateHiveDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.hives.create(dto, await this.context(req, organizationId));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateHiveDto>,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.hives.update(id, dto, await this.context(req, organizationId));
  }
}
