import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialAuditTrailService } from './financial-audit-trail.service';

@Controller('financial-audit-trail')
@Roles('owner')
export class FinancialAuditTrailController {
 constructor(private readonly service: FinancialAuditTrailService) {}
 @Get()
 list(@Query('month') month?: string, @Query('entityType') entityType?: string, @Query('entityReference') entityReference?: string) {
  return this.service.list(month, entityType, entityReference);
 }
}
