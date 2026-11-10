import {Body,Controller,Get,Param,Patch,Post,UseGuards,Req} from '@nestjs/common';
import {PerformanceStrategyService} from './performance-strategy.service';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {RolesGuard} from '../auth/roles.guard';
import {Roles} from '../auth/roles.decorator';
@Controller('performance-strategy')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('owner')
export class PerformanceStrategyController{
 constructor(private service:PerformanceStrategyService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
 @Post('targets') create(@Body()b:any,@Req()req:any){return this.service.create(b,req.user?.sub||req.user?.email||'owner');}
 @Patch('targets/:id') update(@Param('id')id:string,@Body()b:any){return this.service.update(id,b);}
 @Post('targets/:id/updates') addUpdate(@Param('id')id:string,@Body()b:any,@Req()req:any){return this.service.addUpdate(id,b,req.user?.sub||req.user?.email||'owner');}
 @Get('targets/:id/history') history(@Param('id')id:string){return this.service.history(id);}
}
