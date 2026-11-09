import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { InvestmentService } from './investment.service';

@Roles('owner')
@Controller('investment')
export class InvestmentController {
  constructor(private service: InvestmentService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('scenarios') scenarios() { return this.service.listScenarios(); }
  @Post('scenarios') createScenario(@Body() body: any, @Req() req: any) { return this.service.createScenario(body, req.user); }
  @Patch('scenarios/:id/status') updateStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.updateStatus(id, body, req.user); }
  @Post('decisions') createDecision(@Body() body: any, @Req() req: any) { return this.service.createDecision(body, req.user); }
}
