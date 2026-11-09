import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CorrectiveActionsService } from './corrective-actions.service';
import { CreateCorrectiveActionDto, CreateFromInspectionDto, ReviewCorrectiveActionDto, UpdateCorrectiveActionDto } from './dto';
@Controller('corrective-actions')
export class CorrectiveActionsController {
 constructor(private readonly service:CorrectiveActionsService){}
 @Get() list(@Req() req:any){return this.service.list(req.user)}
 @Get('analytics') analytics(@Req() req:any){return this.service.analytics(req.user)}
 @Post() create(@Body() dto:CreateCorrectiveActionDto,@Req() req:any){return this.service.create(dto,req.user)}
 @Post('from-inspection/:inspectionId') createFromInspection(@Param('inspectionId') inspectionId:string,@Body() dto:CreateFromInspectionDto,@Req() req:any){return this.service.createFromInspection(inspectionId,dto,req.user)}
 @Post(':id/update') update(@Param('id') id:string,@Body() dto:UpdateCorrectiveActionDto,@Req() req:any){return this.service.update(id,dto,req.user)}
 @Post(':id/review') review(@Param('id') id:string,@Body() dto:ReviewCorrectiveActionDto,@Req() req:any){return this.service.review(id,dto,req.user)}
}
