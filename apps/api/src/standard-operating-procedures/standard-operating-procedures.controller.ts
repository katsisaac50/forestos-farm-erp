import { Body, Controller, Get, Patch, Post, Query, Req, Param } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { StandardOperatingProceduresService } from './standard-operating-procedures.service';
@Controller('sops')
export class StandardOperatingProceduresController {
 constructor(private readonly service:StandardOperatingProceduresService){}
 @Get('overview') @Roles('owner') overview(){return this.service.overview();}
 @Get('templates') @Roles('owner') templates(){return this.service.listTemplates();}
 @Post('seed-defaults') @Roles('owner') seed(@Req() req:any){return this.service.seedDefaults(req.user?.sub||req.user?.email||'owner');}
 @Post('templates') @Roles('owner') createTemplate(@Body() b:any,@Req() req:any){return this.service.createTemplate(b,req.user?.sub||req.user?.email||'owner');}
 @Patch('templates/:id/status') @Roles('owner') templateStatus(@Param('id') id:string,@Body() b:any){return this.service.activateTemplate(id,b);}

 @Get('my-runs')
 myRuns(@Req() req:any){
  const actor=req.user?.email||req.user?.username||req.user?.sub||'';
  return this.service.myRuns(String(actor));
 }
 @Get('runs') @Roles('owner') runs(@Query() q:any){return this.service.listRuns(q);}
 @Post('runs') @Roles('owner') createRun(@Body() b:any,@Req() req:any){return this.service.createRun(b,req.user?.sub||req.user?.email||'owner');}
 @Patch('runs/:id') updateRun(@Param('id') id:string,@Body() b:any,@Req() req:any){return this.service.updateRun(id,b,req.user?.sub||req.user?.email||'owner',req.user?.role||'');}
}
