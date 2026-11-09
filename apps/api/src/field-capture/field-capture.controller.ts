import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { FieldCaptureService } from './field-capture.service';
import { EvidenceStorageService } from './evidence-storage.service';

@Controller('field-capture')
export class FieldCaptureController {
  constructor(private readonly captures: FieldCaptureService, private readonly evidence: EvidenceStorageService, private readonly access: OrganizationAccessService) {}
  private async context(req: any, orgId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!orgId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.access.resolveContext(userId, orgId);
  }
  @Post()
  async submit(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    return this.captures.submit(body, c, req.user?.email || c.userId);
  }
  @Post(':id/evidence')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } }))
  async uploadEvidence(@Param('id') id: string, @UploadedFile() file: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    return this.evidence.upload(id, file, c, req.user?.email || c.userId);
  }

  @Get(':id/evidence/:evidenceId')
  async downloadEvidence(@Param('id') id: string, @Param('evidenceId') evidenceId: string, @Req() req: any, @Headers('x-organization-id') orgId?: string, @Res() res?: any) {
    const c = await this.context(req, orgId);
    const item = await this.evidence.getDownload(id, evidenceId, c, req.user?.email || c.userId);
    res.setHeader('Content-Type', item.mimeType);
    res.setHeader('Content-Length', String(item.bytes.length));
    res.setHeader('Content-Disposition', `attachment; filename="evidence-${evidenceId}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(item.bytes);
  }


  @Delete(':id/evidence/:evidenceId')
  async deleteEvidence(@Param('id') id: string, @Param('evidenceId') evidenceId: string, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    const normalized = (c.roles || []).map((r: any) => String(r).toLowerCase());
    if (!normalized.some((r: string) => ['owner', 'admin', 'manager'].includes(r))) {
      throw new ForbiddenException('Only an organization owner, admin, or manager may delete evidence');
    }
    return this.evidence.deleteEvidence(id, evidenceId, c, req.user?.email || c.userId);
  }

  @Get('governance/summary')
  async evidenceGovernanceSummary(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.evidence.governanceSummary(await this.context(req, orgId));
  }

  @Get()
  async list(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query() query?: any) {
    return this.captures.list(await this.context(req, orgId), query || {});
  }
  @Patch(':id/review')
  async review(@Param('id') id: string, @Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    return this.captures.review(id, body, c, req.user?.email || c.userId);
  }
}
