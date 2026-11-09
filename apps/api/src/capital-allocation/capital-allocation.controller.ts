import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CapitalAllocationService } from './capital-allocation.service';
@Controller('capital-allocation')
@Roles('owner')
export class CapitalAllocationController {
 constructor(private service:CapitalAllocationService){}
 @Get() dashboard(){return this.service.dashboard();}
 @Post('policy') savePolicy(@Body() body:any,@Req() req:any){return this.service.savePolicy(body,req.user);}
 @Post('proposals') createProposal(@Body() body:any,@Req() req:any){return this.service.createProposal(body,req.user);}
 @Patch('proposals/:id/review') review(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.review(id,body,req.user);}
}
