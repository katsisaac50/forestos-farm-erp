import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CapitalSpendVerificationService } from './capital-spend-verification.service';
@Controller('capital-spend-verification')
@Roles('owner')
export class CapitalSpendVerificationController {
 constructor(private service:CapitalSpendVerificationService){}
 @Get('reconciliation') reconciliationReport(){return this.service.reconciliationReport();}
 @Get() dashboard(){return this.service.dashboard();}
 @Post() create(@Body() body:any,@Req() req:any){return this.service.create(body,req.user);}
 @Patch(':id/review') review(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.review(id,body,req.user);}
 @Patch(':id/evidence-reference') addEvidenceReference(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.addEvidenceReference(id,body,req.user);}
 @Post(':id/correction-request') requestCorrection(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.requestCorrection(id,body,req.user);}
 @Post(':id/reversal') createReversal(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.createReversal(id,body,req.user);}
}
