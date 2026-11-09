import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { StatementMatchingService } from './statement-matching.service';
import { ImportStatementDto, MatchDecisionDto } from './dto';

@Controller('statement-matching')
@Roles('owner')
export class StatementMatchingController {
  constructor(private readonly service: StatementMatchingService) {}

  @Get('imports')
  list(@Query('month') month?: string) { return this.service.listImports(month); }

  @Get('imports/:importId')
  get(@Param('importId') importId: string) { return this.service.getImport(importId); }

  @Post('imports')
  create(@Body() dto: ImportStatementDto, @Req() req: any) {
    const user = req.user || {};
    return this.service.importCsv(dto, String(user.email || user.username || user.sub || 'unknown').toLowerCase());
  }

  @Get('imports/:importId/rows/:rowId/candidates')
  candidates(@Param('importId') importId: string, @Param('rowId') rowId: string) {
    return this.service.candidates(importId, rowId);
  }

  @Post('imports/:importId/rows/:rowId/decision')
  decide(@Param('importId') importId: string, @Param('rowId') rowId: string, @Body() dto: MatchDecisionDto, @Req() req: any) {
    const user = req.user || {};
    return this.service.decide(importId, rowId, dto.decision, dto.transactionId, String(user.email || user.username || user.sub || 'unknown').toLowerCase());
  }
}
