import {Body,Controller,Get,Param,Post,Patch,Query,Req,UploadedFile,UseInterceptors,Res,BadRequestException} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {memoryStorage} from 'multer';
import type {Response} from 'express';
import {Roles} from '../auth/roles.decorator';
import {CaseEvidenceService} from './case-evidence.service';
import {QuarantineEvidenceDto,ReviewEvidenceDto} from './dto';
@Controller('case-evidence') @Roles('owner')
export class CaseEvidenceController {
 constructor(private service:CaseEvidenceService){}
 @Post('upload')
 @UseInterceptors(FileInterceptor('file',{storage:memoryStorage(),limits:{fileSize:10*1024*1024,files:1}}))
 upload(@UploadedFile() file:any,@Body() body:any,@Req() req:any){
  if(!file)throw new BadRequestException('A file is required');
  return this.service.uploadFile(String(body.caseId||''),String(body.evidenceCode||''),body.description,this.actor(req),file);
 }
 @Get(':id/download')
 async download(@Param('id') id:string,@Res({passthrough:true}) res:Response){
  const result=await this.service.downloadFile(id);
  res.setHeader('Content-Type',result.mimeType);
  res.setHeader('Content-Disposition','attachment; filename="'+result.fileName.replace(/["\\\\\\r\\n]/g,'_')+'"');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  return result.stream;
 }
 @Get('recovery-escalations/provider-health')
 recoveryProviderHealth(){return this.service.getNotificationProviderHealth()}
 @Post('recovery-escalations/events/:id/replay')
 replayRecoveryNotification(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.replayFailedNotification(id,this.actor(req),body?.reason)}
 @Get('recovery-escalations/scheduler-status')
 recoverySchedulerStatus(){return this.service.getRecoverySchedulerStatus()}
 @Post('recovery-escalations/run')
 runRecoveryEscalations(@Body() body:any,@Req() req:any){return this.service.runRecoveryEscalationEvaluation(this.actor(req),body?.daysAhead===undefined?7:Number(body.daysAhead))}
 @Get('recovery-escalations/events')
 recoveryEscalationEvents(@Query('limit') limit?:string,@Query('status') status?:string,@Query('incidentCode') incidentCode?:string,@Query('from') from?:string,@Query('to') to?:string){return this.service.listEscalationEvents(limit===undefined?100:Number(limit),{status,incidentCode,from,to})}
 @Get('recovery-escalations/audit-summary')
 recoveryNotificationAuditSummary(){return this.service.getNotificationAuditSummary()}
 @Get('recovery-escalations/delivery-status')
 recoveryDeliveryStatus(){return this.service.getNotificationDeliveryStatus()}
 @Post('recovery-escalations/deliver')
 deliverRecoveryNotifications(@Body() body:any,@Req() req:any){return this.service.processQueuedNotifications(this.actor(req),body?.limit===undefined?25:Number(body.limit))}
 @Post('recovery-escalations/retry-failed')
 retryFailedRecoveryNotifications(@Body() body:any){return this.service.retryFailedNotifications(body?.limit===undefined?25:Number(body.limit))}
 @Get('recovery-alerts')
 recoveryAlerts(@Query('daysAhead') daysAhead?:string){return this.service.getRecoveryAlerts(daysAhead===undefined?7:Number(daysAhead))}
 @Get('recovery-incidents')
 recoveryIncidents(@Query('status') status?:string){return this.service.listRecoveryIncidents(status)}
 @Post('recovery-incidents')
 createRecoveryIncident(@Body() body:any,@Req() req:any){return this.service.createRecoveryIncident(body,this.actor(req))}
 @Patch('recovery-incidents/:id')
 updateRecoveryIncident(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.updateRecoveryIncident(id,body,this.actor(req))}
 @Post('recovery-incidents/:id/approve')
 approveRecoveryIncident(@Param('id') id:string,@Body('reason') reason:string,@Req() req:any){return this.service.approveRecoveryIncident(id,this.actor(req),reason)}
 @Post('recovery-incidents/:id/close')
 closeRecoveryIncident(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.closeRecoveryIncident(id,this.actor(req),body.reason,body.resolutionSummary)}
 @Get('operations/health')
 storageHealth(){return this.service.storageHealth()}
 @Post('operations/reconcile')
 reconcile(@Body() body:any,@Req() req:any){
  const apply=body?.apply===true;
  return this.service.reconcileStorage(apply,this.actor(req));
 }
 @Get() list(@Query('caseId') caseId:string){return this.service.list(caseId)}
 @Get(':id/history') history(@Param('id') id:string){return this.service.history(id)}
 @Post(':id/review') review(@Param('id') id:string,@Body() dto:ReviewEvidenceDto,@Req() req:any){return this.service.review(id,this.actor(req),dto.reason,dto.description)}
 @Post(':id/quarantine') quarantine(@Param('id') id:string,@Body() dto:QuarantineEvidenceDto,@Req() req:any){return this.service.quarantine(id,this.actor(req),dto.reason)}
 private actor(req:any){const u=req.user||{};return String(u.email||u.username||u.sub||'unknown').toLowerCase()}
}
