import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AlertCenterService } from './alert-center.service';
@Controller('alert-center')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('owner')
export class AlertCenterController {
 constructor(private readonly service:AlertCenterService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
 @Post('refresh') refresh(@Req() req:any){return this.service.refresh(req.user?.sub||req.user?.email||'owner');}
 @Patch(':id/state') act(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.act(id,body,req.user?.sub||req.user?.email||'owner');}
}
