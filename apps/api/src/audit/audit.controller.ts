import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly service: AuditService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Roles('owner')
  @Get()
  async list(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Authenticated user ID is missing');
    }
    if (!organizationId) {
      throw new BadRequestException(
        'Set X-Organization-Id to an organization you belong to',
      );
    }
    const context = await this.organizationAccess.resolveContext(userId, organizationId);
    return this.service.list(context.organizationId, Number(limit) || 100);
  }
}