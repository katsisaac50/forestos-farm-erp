import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialControlReportService } from './financial-control-report.service';
@Controller('financial-control-report')
@Roles('owner')
export class FinancialControlReportController {
 constructor(private readonly service: FinancialControlReportService) {}
 @Get() report(@Query('month') month?: string, @Query('compareTo') compareTo?: string) {
  return this.service.report(month, compareTo);
 }
}
