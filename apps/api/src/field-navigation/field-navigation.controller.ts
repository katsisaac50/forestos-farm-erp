import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FieldNavigationService } from './field-navigation.service';
import { CreateNavigationTargetDto } from './dto';

@Controller('field-navigation')
export class FieldNavigationController {
  constructor(private readonly service: FieldNavigationService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateNavigationTargetDto, @Req() req: any) {
    return this.service.create(
      dto,
      req?.user?.email || req?.user?.username || req?.user?.sub || 'authenticated-user',
    );
  }

  @Post(':id/archive')
  @Roles('owner')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }
}
