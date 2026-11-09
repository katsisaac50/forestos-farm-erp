import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { FarmMapService } from './farm-map.service';
import { CreateFarmMapFeatureDto } from './dto';
@Controller('farm-map')
@UseGuards(JwtAuthGuard)
export class FarmMapController {
  constructor(private readonly service: FarmMapService) {}
  @Get() list(@Query('includeArchived') includeArchived?:string) { return this.service.list(includeArchived==='true'); }
  @Post() create(@Body() dto:CreateFarmMapFeatureDto,@Req() req:any) {
    return this.service.create(dto,req?.user?.email||req?.user?.username||req?.user?.sub||'authenticated-user');
  }
  @Post(':id/archive') @Roles('owner') archive(@Param('id') id:string) { return this.service.archive(id); }
}
