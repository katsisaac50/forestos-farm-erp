import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RiskManagementService } from './risk-management.service';

@Controller('risk-management')
@Roles('owner')
export class RiskManagementController {
  constructor(private readonly service: RiskManagementService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('risks') listRisks(@Query() query: any) { return this.service.listRisks(query); }
  @Post('risks') createRisk(@Body() body: any, @Req() req: any) { return this.service.createRisk(body, req.user?.sub || req.user?.email || 'owner'); }
  @Patch('risks/:id') updateRisk(@Param('id') id: string, @Body() body: any) { return this.service.updateRisk(id, body); }
  @Get('actions') listActions(@Query('riskId') riskId?: string) { return this.service.listActions(riskId); }
  @Post('actions') createAction(@Body() body: any, @Req() req: any) { return this.service.createAction(body, req.user?.sub || req.user?.email || 'owner'); }
  @Patch('actions/:id') updateAction(@Param('id') id: string, @Body() body: any) { return this.service.updateAction(id, body); }
}
