import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialGovernanceService } from './financial-governance.service';

@Controller('financial-governance')
@Roles('owner')
export class FinancialGovernanceController {
  constructor(private readonly service: FinancialGovernanceService) {}
  @Get()
  getScorecard(@Query('month') month?: string) {
    return this.service.getScorecard(month);
  }
}
