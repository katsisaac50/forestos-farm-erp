import { Body, Controller, Get, Param, Post, Patch, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CreateInvestigationCaseDto, UpdateInvestigationCaseDto } from './dto';
import { FinancialInvestigationCasesService } from './financial-investigation-cases.service';
@Controller('financial-investigation-cases')
@Roles('owner')
export class FinancialInvestigationCasesController {
 constructor(private service: FinancialInvestigationCasesService) {}
 @Get() list(@Query('status') status?: string, @Query('severity') severity?: string) { return this.service.list(status, severity); }
 @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
 @Post() create(@Body() dto: CreateInvestigationCaseDto, @Req() req: any) { return this.service.create(dto, this.actor(req)); }
 @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateInvestigationCaseDto, @Req() req: any) { return this.service.update(id, dto, this.actor(req)); }
 @Post(':id/second-review') secondReview(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.service.secondReview(id, this.actor(req), reason); }
 @Post(':id/reopen') reopen(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.service.reopen(id, this.actor(req), reason); }
 private actor(req: any): string { const u = req.user || {}; return String(u.email || u.username || u.sub || 'unknown').toLowerCase(); }
}
