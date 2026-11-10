import {Body,Controller,Get,Param,Post,Req,UseGuards} from '@nestjs/common';
import {BackupContinuityService} from './backup-continuity.service';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {RolesGuard} from '../auth/roles.guard';
import {Roles} from '../auth/roles.decorator';
@Controller('backup-continuity')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('owner')
export class BackupContinuityController{
 constructor(private service:BackupContinuityService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
 @Get('records') list(){return this.service.list();}
 @Post('records') create(@Body()b:any,@Req()req:any){return this.service.create(b,req.user?.sub||req.user?.email||'owner');}
 @Post('records/:id/verify') verify(@Param('id')id:string,@Body()b:any,@Req()req:any){return this.service.verify(id,b,req.user?.sub||req.user?.email||'owner');}
 @Post('recovery-drill') drill(@Body()b:any,@Req()req:any){return this.service.drill(b,req.user?.sub||req.user?.email||'owner');}
}
