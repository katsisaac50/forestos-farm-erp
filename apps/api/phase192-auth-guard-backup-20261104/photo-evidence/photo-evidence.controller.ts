import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AuthGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PhotoEvidenceService } from './photo-evidence.service';
import { PhotoEvidenceMetadataDto, PhotoEvidenceReviewDto } from './photo-evidence.dto';
const MAX_BYTES=4_000_000;
@Controller('photo-evidence')
@UseGuards(AuthGuard)
export class PhotoEvidenceController {
 constructor(private readonly service:PhotoEvidenceService){}
 private actor(req:any){return String(req.user?.email||req.user?.username||req.user?.sub||'');}
 private owner(req:any){return String(req.user?.role||req.user?.roles||'').toLowerCase().includes('owner');}
 @Get() async list(@Req() req:any){return this.service.list(this.actor(req),this.owner(req));}
 @Post('upload')
 @UseInterceptors(FileInterceptor('photo',{storage:memoryStorage(),limits:{fileSize:MAX_BYTES,files:1}}))
 async upload(@UploadedFile() file:any,@Body() meta:PhotoEvidenceMetadataDto,@Req() req:any){
  if(!file)throw new BadRequestException('Select a photo first.');
  return this.service.upload(file,meta,this.actor(req));
 }
 @Get(':id/file') async file(@Param('id') id:string,@Req() req:any,@Res() res:Response){
  const item=await this.service.getFile(id,this.actor(req),this.owner(req));
  res.setHeader('Content-Type',item.mimeType);
  res.setHeader('Content-Disposition','inline; filename="'+item.filename.replace(/[\r\n"]/g,'_')+'"');
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Cache-Control','private, no-store');
  return res.status(200).send(item.buffer);
 }
 @Patch(':id/approve') @Roles('owner') async approve(@Param('id') id:string,@Body() dto:PhotoEvidenceReviewDto,@Req() req:any){return this.service.review(id,dto,this.actor(req),true);}
 @Patch(':id/reject') @Roles('owner') async reject(@Param('id') id:string,@Body() dto:PhotoEvidenceReviewDto,@Req() req:any){return this.service.review(id,dto,this.actor(req),false);}
}
