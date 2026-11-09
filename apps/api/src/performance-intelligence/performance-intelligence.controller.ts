import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { PerformanceIntelligenceService } from './performance-intelligence.service';
@Controller('performance-intelligence')
@Roles('owner')
export class PerformanceIntelligenceController {
  constructor(private readonly service:PerformanceIntelligenceService) {}
  @Get('catalog') catalog() { return this.service.catalog(); }
  @Post('apply') apply(@Body() body:any,@Req() req:any) { return this.service.applyMetric(body,req.user?.sub||req.user?.email||'owner'); }
}
