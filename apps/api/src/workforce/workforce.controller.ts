import { Body, BadRequestException, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { WorkforceService } from './workforce.service';

@Controller('workforce')
@Roles('owner')
export class WorkforceController {
  constructor(private readonly service: WorkforceService) {}

  private org(id?: string): string {
    if (!id) throw new BadRequestException('X-Organization-Id header required');
    return id;
  }

  @Get('dashboard')
  dashboard(@Headers('x-organization-id') organizationId?: string) {
    return this.service.dashboard(this.org(organizationId));
  }

  @Get('workers')
  workers(@Headers('x-organization-id') organizationId?: string) {
    return this.service.listWorkers(this.org(organizationId));
  }

  @Post('workers')
  createWorker(@Body() body: any, @Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.createWorker(body, req.user, this.org(organizationId));
  }

  @Get('tasks')
  tasks(@Headers('x-organization-id') organizationId?: string) {
    return this.service.listTasks(this.org(organizationId));
  }

  @Post('tasks')
  createTask(@Body() body: any, @Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.createTask(body, req.user, this.org(organizationId));
  }

  @Patch('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.updateTask(id, body, req.user, this.org(organizationId));
  }

  @Get('entries')
  entries(@Query('taskId') taskId?: string, @Headers('x-organization-id') organizationId?: string) {
    return this.service.listEntries(this.org(organizationId), taskId);
  }

  @Post('entries')
  createEntry(@Body() body: any, @Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.createEntry(body, req.user, this.org(organizationId));
  }
}