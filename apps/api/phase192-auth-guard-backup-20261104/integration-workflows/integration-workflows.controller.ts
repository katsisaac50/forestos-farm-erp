import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { IntegrationWorkflowsService } from './integration-workflows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { OrganizationContext } from '../organizations/organization-context';

@Controller('integration-workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class IntegrationWorkflowsController {
  constructor(
    private readonly service: IntegrationWorkflowsService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(
    req: any,
    organizationId?: string,
  ): Promise<OrganizationContext> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    if (!userId) {
      throw new BadRequestException('Authenticated user ID is missing');
    }

    if (!organizationId) {
      throw new BadRequestException(
        'Set X-Organization-Id to an organization you belong to',
      );
    }

    return this.organizationAccess.resolveContext(userId, organizationId);
  }

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('events')
  list(@Query() q: any) {
    return this.service.list(q);
  }

  @Post('events')
  create(@Body() b: any, @Req() req: any) {
    return this.service.create(
      b,
      req.user?.sub || req.user?.email || 'owner',
    );
  }

  @Post('events/:id/process')
  async process(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organization-id') orgId?: string,
  ) {
    const context = await this.context(req, orgId);

    return this.service.process(context, id, context.userId);
  }

  @Post('events/:id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancel(
      id,
      req.user?.sub || req.user?.email || 'owner',
    );
  }
}





// import {Body,Controller,Get,Param,Post,Query,Req,UseGuards} from '@nestjs/common';
// import {IntegrationWorkflowsService} from './integration-workflows.service';
// import {JwtAuthGuard} from '../auth/jwt-auth.guard';
// import {RolesGuard} from '../auth/roles.guard';
// import {Roles} from '../auth/roles.decorator';
// import {
//   BadRequestException,
//   Headers,
// } from '@nestjs/common';

// import { OrganizationAccessService } from '../organizations/organization-access.service';
// import { OrganizationContext } from '../organizations/organization-context';

// @Controller('integration-workflows')
// @UseGuards(JwtAuthGuard,RolesGuard)
// @Roles('owner')
// export class IntegrationWorkflowsController{
//  constructor(
//   private service: IntegrationWorkflowsService,
//   private organizationAccess: OrganizationAccessService,
// ) {}

// private async context(
//   req: any,
//   organizationId?: string,
// ): Promise<OrganizationContext> {
//   const userId = req.user?.sub || req.user?.userId || req.user?.id;

//   if (!userId) {
//     throw new BadRequestException('Authenticated user ID is missing');
//   }

//   if (!organizationId) {
//     throw new BadRequestException(
//       'Set X-Organization-Id to an organization you belong to',
//     );
//   }

//   return this.organizationAccess.resolveContext(userId, organizationId);
// }
//  @Get('dashboard') dashboard(){return this.service.dashboard();}
//  @Get('events') list(@Query()q:any){return this.service.list(q);}
//  @Post('events') create(@Body()b:any,@Req()req:any){return this.service.create(b,req.user?.sub||req.user?.email||'owner');}
//  @Post('events/:id/process')
// async process(
//   @Param('id') id: string,
//   @Req() req: any,
//   @Headers('x-organization-id') orgId?: string,
// ) {
//   const context = await this.context(req, orgId);

//   return this.service.process(
//     context,
//     id,
//     context.userId,
//   );
// }
// //  @Post('events/:id/process') process(@Param('id')id:string,@Req()req:any){return this.service.process(id,req.user?.sub||req.user?.email||'owner');}
//  @Post('events/:id/cancel') cancel(@Param('id')id:string,@Req()req:any){return this.service.cancel(id,req.user?.sub||req.user?.email||'owner');}
// }
