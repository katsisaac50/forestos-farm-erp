import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CommandCentreService } from './command-centre.service';
@Controller('command-centre')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('owner')
export class CommandCentreController {
 constructor(private readonly service:CommandCentreService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
}
