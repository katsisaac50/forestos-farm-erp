import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CostIntelligenceService } from './cost-intelligence.service';

@Roles('owner')
@Controller('cost-intelligence')
export class CostIntelligenceController {
  constructor(private service: CostIntelligenceService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('plans') plans() { return this.service.listPlans(); }
  @Post('plans') createPlan(@Body() body: any, @Req() req: any) { return this.service.createPlan(body, req.user); }
  @Get('allocations') allocations(@Query('planId') planId?: string) { return this.service.listAllocations(planId); }
  @Post('allocations') createAllocation(@Body() body: any, @Req() req: any) { return this.service.createAllocation(body, req.user); }
}
