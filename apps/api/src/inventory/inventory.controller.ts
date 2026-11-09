import {BadRequestException,Body,Controller,Get,Headers,Patch,Param,Post,Req} from '@nestjs/common';import {InventoryService} from './inventory.service';import {CreateInventoryDto} from './dto';import {OrganizationAccessService} from '../organizations/organization-access.service';
@Controller('inventory') export class InventoryController {
 constructor(private service:InventoryService,private organizationAccess:OrganizationAccessService){}
 private async context(req:any,organizationId?:string){const userId=req.user?.sub||req.user?.userId||req.user?.id;if(!userId)throw new BadRequestException('Authenticated user ID is missing');if(!organizationId)throw new BadRequestException('Set X-Organization-Id to an organization you belong to');return this.organizationAccess.resolveContext(String(userId),organizationId);}
 @Get() async all(@Req() req:any,@Headers('x-organization-id') organizationId?:string){return this.service.findAll(await this.context(req,organizationId));}
 @Post() async create(@Body() dto:CreateInventoryDto,@Req() req:any,@Headers('x-organization-id') organizationId?:string){return this.service.create(dto,await this.context(req,organizationId));}
 @Patch(':id') async update(@Param('id') id:string,@Body() dto:Partial<CreateInventoryDto>,@Req() req:any,@Headers('x-organization-id') organizationId?:string){return this.service.update(id,dto,await this.context(req,organizationId));}
}
