import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FieldVerificationService } from './field-verification.service';
import { CreateFieldVerificationDto, ReviewFieldVerificationDto } from './field-verification.dto';
@Controller('field-verification')
@UseGuards(AuthGuard)
export class FieldVerificationController {
 constructor(private readonly service:FieldVerificationService){}
 @Get() async list(@Req() req:any){
  const actor=String(req.user?.email||req.user?.username||req.user?.sub||'');
  const role=String(req.user?.role||req.user?.roles||'').toLowerCase();
  return this.service.list(actor,role.includes('owner'));
 }
 @Post() async create(@Body() dto:CreateFieldVerificationDto,@Req() req:any){
  const actor=String(req.user?.email||req.user?.username||req.user?.sub||'');
  if(dto.workerIdentifier.trim().toLowerCase()!==actor.trim().toLowerCase())throw new ForbiddenException('Worker identifier must match your login.');
  return this.service.create(dto,actor);
 }
 @Patch(':id/approve') @Roles('owner') async approve(@Param('id') id:string,@Body() dto:ReviewFieldVerificationDto,@Req() req:any){
  return this.service.review(id,dto,String(req.user?.email||req.user?.username||req.user?.sub||'owner'),true);
 }
 @Patch(':id/reject') @Roles('owner') async reject(@Param('id') id:string,@Body() dto:ReviewFieldVerificationDto,@Req() req:any){
  return this.service.review(id,dto,String(req.user?.email||req.user?.username||req.user?.sub||'owner'),false);
 }
}
