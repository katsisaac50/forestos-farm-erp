import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialEvidenceService } from './financial-evidence.service';
import { CreateEvidenceDto } from './create-evidence.dto';
import { ReviewEvidenceDto } from './review-evidence.dto';
@Controller('financial-evidence')
@Roles('owner')
export class FinancialEvidenceController {
 constructor(private readonly service: FinancialEvidenceService) {}
 @Get() list(@Query('month') month?: string, @Query('status') status?: string) { return this.service.list(month, status); }
 @Post() create(@Body() dto: CreateEvidenceDto) { return this.service.create(dto); }
 @Patch(':evidenceId/review') review(@Param('evidenceId') id: string, @Body() dto: ReviewEvidenceDto) { return this.service.review(id, dto); }
}
