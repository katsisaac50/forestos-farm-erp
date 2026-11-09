import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { MaintenanceService } from './maintenance.service';
@Controller('maintenance')
@Roles('owner')
export class MaintenanceController {
 constructor(private readonly service:MaintenanceService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
 @Get('assets') assets(@Query() q:any){return this.service.listAssets(q);}
 @Post('assets') createAsset(@Body() b:any,@Req() req:any){return this.service.createAsset(b,req.user?.sub||req.user?.email||'owner');}
 @Patch('assets/:id') updateAsset(@Param('id') id:string,@Body() b:any){return this.service.updateAsset(id,b);}
 @Get('records') records(@Query('assetId') id?:string){return this.service.listRecords(id);}
 @Post('records') createRecord(@Body() b:any,@Req() req:any){return this.service.createRecord(b,req.user?.sub||req.user?.email||'owner');}
 @Patch('records/:id') updateRecord(@Param('id') id:string,@Body() b:any){return this.service.updateRecord(id,b);}
 @Get('parts') parts(){return this.service.listParts();}
 @Post('parts') createPart(@Body() b:any,@Req() req:any){return this.service.createPart(b,req.user?.sub||req.user?.email||'owner');}
 @Patch('parts/:id') adjustPart(@Param('id') id:string,@Body() b:any){return this.service.adjustPart(id,b);}
}
