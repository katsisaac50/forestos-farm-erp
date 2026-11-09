import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { NurseryService } from './nursery.service';
@Roles('owner')
@Controller('nursery')
export class NurseryController {
  constructor(private service: NurseryService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('batches') batches() { return this.service.listBatches(); }
  @Post('batches') createBatch(@Body() body: any, @Req() req: any) { return this.service.createBatch(body, req.user); }
  @Get('movements') movements(@Query('batchId') batchId?: string) { return this.service.listMovements(batchId); }
  @Post('movements') movement(@Body() body: any, @Req() req: any) { return this.service.addMovement(body, req.user); }
}
