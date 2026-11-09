import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { MonthlyFinancialCloseService } from './monthly-financial-close.service';
import { SaveMonthlyCloseDto } from './dto/save-monthly-close.dto';
import { ReviewMonthlyCloseDto } from './dto/review-monthly-close.dto';
import { ReopenMonthlyCloseDto } from './dto/reopen-monthly-close.dto';

@Controller('monthly-financial-close')
@Roles('owner')
export class MonthlyFinancialCloseController {
  constructor(private readonly service: MonthlyFinancialCloseService) {}

  @Get()
  dashboard(@Query('month') month?: string) { return this.service.dashboard(month); }

  @Get('versions/:month')
  versions(@Param('month') month: string) { return this.service.versionsForMonth(month); }

  @Post()
  saveDraft(@Body() body: SaveMonthlyCloseDto, @Req() req: any) {
    return this.service.saveDraft(body, this.actor(req));
  }

  @Patch(':id/review')
  review(@Param('id') id: string, @Body() body: ReviewMonthlyCloseDto, @Req() req: any) {
    return this.service.review(id, body, this.actor(req));
  }

  @Patch(':id/reopen')
  reopen(@Param('id') id: string, @Body() body: ReopenMonthlyCloseDto, @Req() req: any) {
    return this.service.reopen(id, body, this.actor(req));
  }

  private actor(req: any): string {
    const user = req.user || {};
    return String(user.email || user.username || user.sub || 'unknown').toLowerCase();
  }
}