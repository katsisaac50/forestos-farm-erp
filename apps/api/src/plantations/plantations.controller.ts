import { BadRequestException, Body, Controller, Get, Headers, Patch, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';

import { CreatePlantationDto } from './dto';
import { PlantationsService } from './plantations.service';
import { OrganizationAccessService } from '../organizations/organization-access.service';

@Controller('plantations')
export class PlantationsController {
  constructor(
    private readonly plantations: PlantationsService,
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
    return this.plantations.findAll(await this.context(req, organizationId));
  }

  @Roles('owner', 'admin', 'manager')
  @Get('intelligence')
  async intelligence(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    const context = await this.context(req, organizationId);
    return this.plantations.intelligence(context);
  }

  @Roles('owner', 'admin', 'manager')
  @Post()
  async create(
    @Body() dto: CreatePlantationDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const context = await this.context(req, organizationId);
    return this.plantations.create(dto, context, req.user?.email);
  }

  @Roles('owner', 'admin', 'manager')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePlantationDto>,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const context = await this.context(req, organizationId);
    return this.plantations.update(id, dto, context, req.user?.email);
  }
}
