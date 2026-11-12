import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto';
import { OrganizationAccessService } from '../organizations/organization-access.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly service: TasksService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  private async context(req: any, organizationId?: string) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user ID is missing');
    if (!organizationId) {
      throw new BadRequestException('Set X-Organization-Id to an organization you belong to');
    }
    return this.organizationAccess.resolveContext(String(userId), organizationId);
  }

  @Get()
  async all(@Req() req: any, @Headers('x-organization-id') organizationId?: string) {
    return this.service.findAll(await this.context(req, organizationId));
  }

  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.create(dto, await this.context(req, organizationId));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaskDto>,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.service.update(id, dto, await this.context(req, organizationId));
  }
}

// import {Body,Controller,Get,Patch,Param,Post} from '@nestjs/common';import {TasksService} from './tasks.service';import {CreateTaskDto} from './dto';
// @Controller('tasks') export class TasksController {constructor(private service:TasksService){} @Get() all(){return this.service.findAll();}@Post() create(@Body() dto:CreateTaskDto){return this.service.create(dto);}@Patch(':id') update(@Param('id') id:string,@Body() dto:Partial<CreateTaskDto>){return this.service.update(id,dto);}}
