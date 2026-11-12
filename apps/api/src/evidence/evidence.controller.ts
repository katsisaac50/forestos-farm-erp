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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { EvidenceService } from './evidence.service';
import { CreateEvidenceDto } from './dto';
import { OrganizationAccessService } from '../organizations/organization-access.service';

@Controller('evidence')
export class EvidenceController {
  constructor(
    private readonly service: EvidenceService,
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
    @Query('inspectionId') inspectionId: string,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.list(
      inspectionId,
      req.user,
      await this.context(req, organizationId),
    );
  }

  @Roles('owner', 'field_worker')
  @Post()
  async create(
    @Body() dto: CreateEvidenceDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.create(dto, req.user, await this.context(req, organizationId));
  }

  @Get(':id/image')
  async image(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Res() res: Response,
  ) {
    const doc: any = await this.service.image(
      id,
      req.user,
      await this.context(req, organizationId),
    );
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(doc.dataBase64, 'base64'));
  }
}


// import {Body,Controller,Get,Param,Post,Query,Req,Res} from '@nestjs/common';
// import {Response} from 'express';import {Roles} from '../auth/roles.decorator';import {EvidenceService} from './evidence.service';import {CreateEvidenceDto} from './dto';
// @Controller('evidence')
// export class EvidenceController {
//  constructor(private service:EvidenceService){}
//  @Get() list(@Query('inspectionId') id:string,@Req() req:any){return this.service.list(id,req.user);}
//  @Roles('owner','field_worker') @Post() create(@Body() dto:CreateEvidenceDto,@Req() req:any){return this.service.create(dto,req.user);}
//  @Get(':id/image') async image(@Param('id') id:string,@Req() req:any,@Res() res:Response){const d:any=await this.service.image(id,req.user);res.setHeader('Content-Type',d.mimeType);res.setHeader('Cache-Control','no-store');return res.send(Buffer.from(d.dataBase64,'base64'));}
// }
