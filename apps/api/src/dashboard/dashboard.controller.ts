import { BadRequestException, Controller, Get, Headers, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { OrganizationAccessService } from '../organizations/organization-access.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Roles('owner')
  @Get('summary')
  async summary(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) {
      throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    }
    const context = await this.organizationAccess.resolveContext(
      String(userId),
      organizationId,
    );
    return this.service.summary(context);
  }
}


// import {Controller,Get} from '@nestjs/common';
// import {Roles} from '../auth/roles.decorator';
// import {DashboardService} from './dashboard.service';
// @Controller('dashboard')
// export class DashboardController {constructor(private readonly service:DashboardService){} @Roles('owner') @Get('summary') summary(){return this.service.summary();}}
