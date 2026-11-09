import { Controller, Get } from '@nestjs/common';
import { ManagementIntelligenceService } from './management-intelligence.service';
import { Roles } from '../auth/roles.decorator';

@Controller('management-intelligence')
@Roles('owner')
export class ManagementIntelligenceController {
  constructor(
    private readonly service: ManagementIntelligenceService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }
}



// import {Controller,Get,UseGuards} from '@nestjs/common';
// import {ManagementIntelligenceService} from './management-intelligence.service';
// import {JwtAuthGuard} from '../auth/jwt-auth.guard';
// import {RolesGuard} from '../auth/roles.guard';
// import {Roles} from '../auth/roles.decorator';
// @Controller('management-intelligence')
// @UseGuards(JwtAuthGuard,RolesGuard)
// @Roles('owner')
// export class ManagementIntelligenceController {
//  constructor(private service:ManagementIntelligenceService){}
//  @Get('dashboard') dashboard(){return this.service.dashboard();}
// }

