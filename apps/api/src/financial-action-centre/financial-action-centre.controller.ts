import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FinancialActionCentreService } from './financial-action-centre.service';
import { UpdateActionDto } from './update-action.dto';

@Controller('financial-action-centre')
@Roles('owner')
export class FinancialActionCentreController {
  constructor(private readonly service: FinancialActionCentreService) {}
  @Get()
  list(@Query('month') month?: string, @Query('status') status?: string) {
    return this.service.list(month, status);
  }
  @Patch(':actionId')
  update(@Param('actionId') actionId: string, @Body() dto: UpdateActionDto) {
    return this.service.update(actionId, dto);
  }
}
