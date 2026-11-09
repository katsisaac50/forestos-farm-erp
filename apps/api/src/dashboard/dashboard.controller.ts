import {Controller,Get} from '@nestjs/common';
import {Roles} from '../auth/roles.decorator';
import {DashboardService} from './dashboard.service';
@Controller('dashboard')
export class DashboardController {constructor(private readonly service:DashboardService){} @Roles('owner') @Get('summary') summary(){return this.service.summary();}}
