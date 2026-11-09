import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialControlPerformanceService } from './financial-control-performance.service';
@Controller('financial-control-performance')
@Roles('owner')
export class FinancialControlPerformanceController {
 constructor(private readonly service: FinancialControlPerformanceService) {}
 @Get() report(@Query('month') month?: string,@Query('compareTo') compareTo?: string){return this.service.report(month,compareTo);}
}
