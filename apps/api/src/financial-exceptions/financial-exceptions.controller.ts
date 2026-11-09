import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialExceptionsService } from './financial-exceptions.service';
@Controller('financial-exceptions')
@Roles('owner')
export class FinancialExceptionsController {
  constructor(private readonly service: FinancialExceptionsService) {}
  @Get() report(@Query('month') month?: string) { return this.service.report(month); }
}
