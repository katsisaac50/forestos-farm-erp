import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PerformanceIntelligenceService } from './performance-intelligence.service';
@Controller('performance-intelligence')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class PerformanceIntelligenceController {
  constructor(private readonly service:PerformanceIntelligenceService) {}
  @Get('catalog') catalog() { return this.service.catalog(); }
  @Post('apply') apply(@Body() body:any,@Req() req:any) { return this.service.applyMetric(body,req.user?.sub||req.user?.email||'owner'); }
}
