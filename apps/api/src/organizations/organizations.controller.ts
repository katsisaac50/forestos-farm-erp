import {Body,Controller,Get,Param,Post,Query,Req} from '@nestjs/common';import {Roles} from '../auth/roles.decorator';import {OrganizationsService} from './organizations.service';
@Controller('organizations') @Roles('owner')
export class OrganizationsController{
 constructor(private service:OrganizationsService){}
 @Get() list(){return this.service.list()}
 @Post() create(@Body() b:any,@Req() req:any){return this.service.create(b,this.actor(req))}
 @Post('memberships') add(@Body() b:any,@Req() req:any){return this.service.addMembership(b,this.actor(req))}
 @Get(':id/memberships') memberships(@Param('id') id:string){return this.service.membershipsFor(id)}
 @Get(':id/audit') audit(@Param('id') id:string,@Query('limit') limit?:string){return this.service.history(id,limit===undefined?100:Number(limit))}
 private actor(req:any){const u=req.user||{};return String(u.sub||u.email||u.username||'unknown').toLowerCase()}
}
