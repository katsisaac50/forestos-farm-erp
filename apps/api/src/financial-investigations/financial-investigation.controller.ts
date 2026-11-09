import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialInvestigationService } from './financial-investigation.service';
import { CreateFinancialInvestigationDto, UpdateFinancialInvestigationDto } from './dto';
@Controller('financial-investigations')
@Roles('owner')
export class FinancialInvestigationController {
 constructor(private readonly service:FinancialInvestigationService){}
 @Get() list(@Query('month') month?:string,@Query('status') status?:string){return this.service.list(month,status);}
 @Post() create(@Body() dto:CreateFinancialInvestigationDto,@Req() req:any){return this.service.create(dto,this.actor(req));}
 @Patch(':id') update(@Param('id') id:string,@Body() dto:UpdateFinancialInvestigationDto,@Req() req:any){return this.service.update(id,dto,this.actor(req));}
 private actor(req:any){const u=req.user||{};return String(u.email||u.username||u.sub||'unknown').toLowerCase();}
}
