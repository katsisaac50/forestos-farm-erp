import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { WorkforceService } from './workforce.service';
@Roles('owner')
@Controller('workforce')
export class WorkforceController {
  constructor(private service: WorkforceService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('workers') workers() { return this.service.listWorkers(); }
  @Post('workers') createWorker(@Body() body: any, @Req() req: any) { return this.service.createWorker(body, req.user); }
  @Get('tasks') tasks() { return this.service.listTasks(); }
  @Post('tasks') createTask(@Body() body: any, @Req() req: any) { return this.service.createTask(body, req.user); }
  @Patch('tasks/:id') updateTask(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.updateTask(id, body, req.user); }
  @Get('entries') entries(@Query('taskId') taskId?: string) { return this.service.listEntries(taskId); }
  @Post('entries') createEntry(@Body() body: any, @Req() req: any) { return this.service.createEntry(body, req.user); }
}
