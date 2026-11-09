import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { VideoEvidenceService } from './video-evidence.service';
import { VideoEvidenceMetadataDto, VideoEvidenceReviewDto } from './video-evidence.dto';

const MAX_VIDEO_BYTES = 100_000_000;

@Controller('video-evidence')
export class VideoEvidenceController {
  constructor(private readonly service: VideoEvidenceService) {}

  private actor(req: any): string {
    return String(req.user?.email || req.user?.username || req.user?.sub || '');
  }
  private owner(req: any): boolean {
    return String(req.user?.role || req.user?.roles || '').toLowerCase().includes('owner');
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.list(this.actor(req), this.owner(req));
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
    })
  )
  async upload(@UploadedFile() file: any, @Body() meta: VideoEvidenceMetadataDto, @Req() req: any) {
    if (!file) throw new BadRequestException('Select a video first.');
    return this.service.upload(file, meta, this.actor(req));
  }

  @Get(':id/file')
  async file(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const range = req.headers.range;
    const item = await this.service.getFile(id, this.actor(req), this.owner(req), range);

    if (item.range) {
      const { start, end } = item.range;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${item.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', String(end - start + 1));
      res.setHeader('Content-Type', item.mimeType);
      res.status(206);
      item.stream.pipe(res);
    } else {
      res.setHeader('Content-Length', String(item.size));
      res.setHeader('Content-Type', item.mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.status(200);
      item.stream.pipe(res);
    }
  }

  @Patch(':id/approve')
  @Roles('owner')
  async approve(@Param('id') id: string, @Body() dto: VideoEvidenceReviewDto, @Req() req: any) {
    return this.service.review(id, dto, this.actor(req), true);
  }

  @Patch(':id/reject')
  @Roles('owner')
  async reject(@Param('id') id: string, @Body() dto: VideoEvidenceReviewDto, @Req() req: any) {
    return this.service.review(id, dto, this.actor(req), false);
  }
}