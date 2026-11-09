import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialReportsService } from './financial-reports.service';

@Controller('financial-reports')
@Roles('owner')
export class FinancialReportsController {
  constructor(private readonly service: FinancialReportsService) {}

  @Get('monthly')
  monthly(@Query('month') month?: string) {
    return this.service.monthly(month);
  }
}
