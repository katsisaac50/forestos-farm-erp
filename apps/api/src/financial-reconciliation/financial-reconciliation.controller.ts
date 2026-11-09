import { Body, Controller, Get, Post, Query, Param, Patch, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialReconciliationService } from './financial-reconciliation.service';
import { CreateReconciliationDto } from './dto';

@Controller('financial-reconciliation')
@Roles('owner')
export class FinancialReconciliationController {
  constructor(private readonly service: FinancialReconciliationService) {}

  @Get()
  list(@Query('month') month?: string) { return this.service.list(month); }

  @Post()
  create(@Body() dto: CreateReconciliationDto, @Req() req: any) {
    return this.service.create(dto, this.actor(req));
  }

  @Patch(':id/review')
  review(@Param('id') id: string, @Body('notes') notes: string, @Req() req: any) {
    return this.service.review(id, this.actor(req), notes);
  }

  private actor(req: any): string {
    const user = req.user || {};
    return String(user.email || user.username || user.sub || 'unknown').toLowerCase();
  }
}
