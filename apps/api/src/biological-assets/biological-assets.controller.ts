import { BadRequestException, Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { BiologicalAssetsService, CreateAssetInput, CreateValuationInput } from './biological-assets.service';

@Controller('biological-assets')
@Roles('owner')
export class BiologicalAssetsController {
  constructor(
    private readonly service: BiologicalAssetsService,
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

  @Get()
  async list(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.list(await this.context(req, organizationId));
  }

  @Get('valuations')
  async listValuations(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
    @Query('blockId') blockId?: string,
  ) {
    return this.service.listValuations(await this.context(req, organizationId), blockId);
  }

  @Post()
  async createAsset(
    @Body() body: CreateAssetInput,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.createAsset(await this.context(req, organizationId), body, this.actor(req));
  }

  @Post('revalue')
  async revalue(
    @Body() body: CreateValuationInput,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.revalue(await this.context(req, organizationId), body, this.actor(req));
  }
}