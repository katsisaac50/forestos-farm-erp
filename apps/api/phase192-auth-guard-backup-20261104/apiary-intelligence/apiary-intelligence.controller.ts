import { BadRequestException, Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { ApiaryIntelligenceService } from './apiary-intelligence.service';

@Controller('apiary-intelligence')
@UseGuards(JwtAuthGuard)
export class ApiaryIntelligenceController {
  constructor(private readonly intelligence: ApiaryIntelligenceService, private readonly organizationAccess: OrganizationAccessService) {}
  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.organizationAccess.resolveContext(userId, organizationId);
  }
  @Get('dashboard')
  async dashboard(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.intelligence.dashboard(await this.context(req, organizationId));
  }
  @Get('productivity')
  async productivity(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.intelligence.productivity(await this.context(req, organizationId));
  }
}
