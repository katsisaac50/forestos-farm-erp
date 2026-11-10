import {BadRequestException,Body,Controller,Get,Headers,Post,Query,Req,UseGuards,ForbiddenException} from '@nestjs/common';
import {Roles} from '../auth/roles.decorator';import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {GrowthService} from './growth.service';import {CreateGrowthSampleDto} from './dto';
import {OrganizationAccessService} from '../organizations/organization-access.service';
import {OrganizationContext} from '../organizations/organization-context';
@Controller('growth') @UseGuards(JwtAuthGuard) export class GrowthController {
 constructor(private service:GrowthService,private access:OrganizationAccessService){}
 private async context(req:any,organizationId?:string):Promise<OrganizationContext>{
  const userId=req.user?.sub||req.user?.userId||req.user?.id;
  if(!userId)throw new BadRequestException('Authenticated user ID is missing');
  if(!organizationId)throw new BadRequestException('Set X-Organization-Id');
  return this.access.resolveContext(userId,organizationId);
 }
 @Get() async list(@Req() req:any,@Headers('x-organization-id') organizationId?:string,@Query('blockId') blockId?:string){
  return this.service.list(await this.context(req,organizationId),blockId);
 }
 @Roles('owner','admin','manager') @Post() async create(@Body() dto:CreateGrowthSampleDto,@Req() req:any,@Headers('x-organization-id') organizationId?:string){
  const context=await this.context(req,organizationId);
  if(!context.roles.some(r=>['owner','admin','manager','field_worker'].includes(r)))throw new ForbiddenException('Organization membership does not allow growth entry');
  return this.service.create(dto,context,req.user?.email);
 }
 @Get('trend') async trend(@Query('blockId') blockId:string,@Req() req:any,@Headers('x-organization-id') organizationId?:string){
  if(!blockId)throw new BadRequestException('blockId is required');
  return this.service.trend(blockId,await this.context(req,organizationId));
 }
}
