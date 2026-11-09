import {Body,Controller,Get,Param,Patch,Post,Query,Req} from '@nestjs/common';
import {Roles} from '../auth/roles.decorator';
import {NotificationPoliciesService} from './notification-policies.service';
@Controller('notification-policies')
@Roles('owner')
export class NotificationPoliciesController{
 constructor(private service:NotificationPoliciesService){}

 @Post('evaluate') evaluate(@Body() body:any,@Req() req:any){return this.service.evaluate(this.actor(req),true)}
 @Get() list(){return this.service.list()}
 @Post() create(@Body() body:any,@Req() req:any){return this.service.create(body,this.actor(req))}
 @Patch(':policyKey') update(@Param('policyKey') key:string,@Body() body:any,@Req() req:any){return this.service.update(key,body,this.actor(req))}
 @Get(':policyKey/history') history(@Param('policyKey') key:string,@Query('limit') limit?:string){return this.service.history(key,limit===undefined?100:Number(limit))}
 private actor(req:any){const u=req.user||{};return String(u.email||u.username||u.sub||'unknown').toLowerCase()}
}
