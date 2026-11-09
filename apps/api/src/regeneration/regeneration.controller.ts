import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RegenerationService } from './regeneration.service';
@Roles('owner')
@Controller('regeneration')
export class RegenerationController {
  constructor(private service: RegenerationService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('plans') plans() { return this.service.listPlans(); }
  @Post('plans') createPlan(@Body() body: any, @Req() req: any) { return this.service.createPlan(body, req.user); }
  @Patch('plans/:id') updatePlan(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.updatePlan(id, body, req.user); }
  @Get('costs') costs(@Query('planId') planId?: string) { return this.service.listCosts(planId); }
  @Post('costs') createCost(@Body() body: any, @Req() req: any) { return this.service.createCost(body, req.user); }
  @Get('survival-checks') checks(@Query('planId') planId?: string) { return this.service.listChecks(planId); }
  @Post('survival-checks') createCheck(@Body() body: any, @Req() req: any) { return this.service.createCheck(body, req.user); }
}
