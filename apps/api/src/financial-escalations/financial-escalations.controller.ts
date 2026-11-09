import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialEscalationsService } from './financial-escalations.service';
import { UpdateEscalationDto } from './update-escalation.dto';
@Controller('financial-escalations')
@Roles('owner')
export class FinancialEscalationsController {
 constructor(private readonly service: FinancialEscalationsService) {}
 @Get() list(@Query('month') month?: string, @Query('status') status?: string) { return this.service.list(month, status); }
 @Patch(':escalationId') update(@Param('escalationId') id: string, @Body() dto: UpdateEscalationDto) { return this.service.update(id, dto); }
}
