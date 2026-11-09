import {Body,Controller,Get,Param,Post,Query,Req,Res} from '@nestjs/common';
import {Response} from 'express';import {Roles} from '../auth/roles.decorator';import {EvidenceService} from './evidence.service';import {CreateEvidenceDto} from './dto';
@Controller('evidence')
export class EvidenceController {
 constructor(private service:EvidenceService){}
 @Get() list(@Query('inspectionId') id:string,@Req() req:any){return this.service.list(id,req.user);}
 @Roles('owner','field_worker') @Post() create(@Body() dto:CreateEvidenceDto,@Req() req:any){return this.service.create(dto,req.user);}
 @Get(':id/image') async image(@Param('id') id:string,@Req() req:any,@Res() res:Response){const d:any=await this.service.image(id,req.user);res.setHeader('Content-Type',d.mimeType);res.setHeader('Cache-Control','no-store');return res.send(Buffer.from(d.dataBase64,'base64'));}
}
