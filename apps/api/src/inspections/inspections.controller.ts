import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto, UpdateInspectionDto } from './dto';
import { OrganizationAccessService } from '../organizations/organization-access.service';

@Controller('inspections')
export class InspectionsController {
  constructor(
    private readonly service: InspectionsService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) {
      throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    }
    return this.organizationAccess.resolveContext(String(userId), organizationId);
  }

  @Get()
  async list(
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.list(req.user, await this.context(req, organizationId));
  }

  @Roles('owner')
  @Post()
  async create(
    @Body() dto: CreateInspectionDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.create(dto, req.user, await this.context(req, organizationId));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.update(id, dto, req.user, await this.context(req, organizationId));
  }
}


// import {Body,Controller,Get,Param,Patch,Post,Req} from '@nestjs/common';
// import {Roles} from '../auth/roles.decorator';
// import {InspectionsService} from './inspections.service';
// import {CreateInspectionDto,UpdateInspectionDto} from './dto';
// @Controller('inspections')
// export class InspectionsController {
//  constructor(private service:InspectionsService){}
//  @Get() list(@Req() req:any){return this.service.list(req.user);}
//  @Roles('owner') @Post() create(@Body() dto:CreateInspectionDto,@Req() req:any){return this.service.create(dto,req.user);}
//  @Patch(':id') update(@Param('id') id:string,@Body() dto:UpdateInspectionDto,@Req() req:any){return this.service.update(id,dto,req.user);}
// }
