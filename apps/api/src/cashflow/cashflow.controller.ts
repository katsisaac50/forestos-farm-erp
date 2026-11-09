import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CashflowService } from './cashflow.service';

@Roles('owner')
@Controller('cashflow')
export class CashflowController {
  constructor(private service: CashflowService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('positions') positions() { return this.service.listPositions(); }
  @Post('positions') createPosition(@Body() body: any, @Req() req: any) { return this.service.createPosition(body, req.user); }
  @Get('plans') plans() { return this.service.listPlans(); }
  @Post('plans') createPlan(@Body() body: any, @Req() req: any) { return this.service.createPlan(body, req.user); }
  @Get('decisions') decisions() { return this.service.listDecisions(); }
  @Post('decisions') createDecision(@Body() body: any, @Req() req: any) { return this.service.createDecision(body, req.user); }
}
