import {Body,Controller,Get,Param,Patch,Post,Req} from '@nestjs/common';
import {Roles} from '../auth/roles.decorator';
import {InspectionsService} from './inspections.service';
import {CreateInspectionDto,UpdateInspectionDto} from './dto';
@Controller('inspections')
export class InspectionsController {
 constructor(private service:InspectionsService){}
 @Get() list(@Req() req:any){return this.service.list(req.user);}
 @Roles('owner') @Post() create(@Body() dto:CreateInspectionDto,@Req() req:any){return this.service.create(dto,req.user);}
 @Patch(':id') update(@Param('id') id:string,@Body() dto:UpdateInspectionDto,@Req() req:any){return this.service.update(id,dto,req.user);}
}
