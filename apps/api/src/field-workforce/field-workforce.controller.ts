import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { FieldWorkforceService } from './field-workforce.service';

@Controller('field-workforce')
export class FieldWorkforceController {
  constructor(private readonly workforce: FieldWorkforceService, private readonly access: OrganizationAccessService) {}
  private async context(req: any, orgId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!orgId) throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    return this.access.resolveContext(userId, orgId);
  }

  @Get('workers')
  async workers(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.workforce.listWorkers(await this.context(req, orgId));
  }
  @Post('workers')
  async createWorker(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    return this.workforce.createWorker(body, c, req.user?.email || c.userId);
  }
  @Get('tasks')
  async tasks(@Req() req: any, @Headers('x-organization-id') orgId?: string, @Query() query?: any) {
    return this.workforce.listTasks(await this.context(req, orgId), query || {});
  }
  @Post('tasks')
  async createTask(@Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    return this.workforce.createTask(body, c, req.user?.email || c.userId);
  }
  @Patch('tasks/:id/status')
  async transition(@Param('id') id: string, @Body() body: any, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    const c = await this.context(req, orgId);
    return this.workforce.transition(id, body, c, req.user?.email || c.userId);
  }
  @Get('tasks/summary')
  async summary(@Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.workforce.summary(await this.context(req, orgId));
  }
  @Get('tasks/:id/history')
  async history(@Param('id') id: string, @Req() req: any, @Headers('x-organization-id') orgId?: string) {
    return this.workforce.history(id, await this.context(req, orgId));
  }
}
