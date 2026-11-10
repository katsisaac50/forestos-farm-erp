import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationAccessService } from './organization-access.service';

type AuthenticatedRequest = Request & {
  user?: { sub?: string; userId?: string; id?: string };
};

@Controller('organization-access')
@UseGuards(JwtAuthGuard)
export class OrganizationAccessController {
  constructor(private readonly access: OrganizationAccessService) {}

  @Get('mine')
  async mine(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    return { organizations: await this.access.listMyOrganizations(userId) };
  }

  @Get('context')
  async context(
    @Req() req: AuthenticatedRequest,
    @Headers('x-organization-id') requestedOrganizationId?: string,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!requestedOrganizationId) {
      throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    }
    return {
      context: await this.access.resolveContext(userId, requestedOrganizationId),
      note: 'Context is verified for this response; domain endpoints must explicitly enforce it.',
    };
  }
}
