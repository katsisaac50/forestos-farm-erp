import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { HarvestService } from './harvest.service';

@Roles('owner')
@Controller('harvest')
export class HarvestController {
  constructor(private service: HarvestService) {}
  @Get('plans') plans() { return this.service.listPlans(); }
  @Post('plans') createPlan(@Body() body: any, @Req() req: any) { return this.service.createPlan(body, req.user); }
  @Patch('plans/:id') updatePlan(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.updatePlan(id, body, req.user); }
  @Get('quotes') quotes() { return this.service.listQuotes(); }
  @Post('quotes') createQuote(@Body() body: any, @Req() req: any) { return this.service.createQuote(body, req.user); }
  @Get('costs') costs(@Query('planId') planId?: string) { return this.service.listCosts(planId); }
  @Post('costs') createCost(@Body() body: any, @Req() req: any) { return this.service.createCost(body, req.user); }
  @Get('scenario/:planId') scenario(@Param('planId') planId: string, @Query('quoteId') quoteId?: string) { return this.service.scenario(planId, quoteId); }
}
