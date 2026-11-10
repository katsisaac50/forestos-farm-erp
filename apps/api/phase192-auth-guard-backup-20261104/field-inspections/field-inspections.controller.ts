import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FieldInspectionsService } from './field-inspections.service';
import { CreateFieldInspectionDto, ReviewFieldInspectionDto, SubmitFieldInspectionDto } from './dto';

@Controller('field-inspections')
@UseGuards(JwtAuthGuard)
export class FieldInspectionsController {
  constructor(private readonly service: FieldInspectionsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user);
  }

  @Post()
  create(@Body() dto: CreateFieldInspectionDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitFieldInspectionDto, @Req() req: any) {
    return this.service.submit(id, dto, req.user);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewFieldInspectionDto, @Req() req: any) {
    return this.service.review(id, dto, req.user);
  }
}
