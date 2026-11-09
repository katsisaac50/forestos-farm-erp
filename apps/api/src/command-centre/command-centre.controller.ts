import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CommandCentreService } from './command-centre.service';
@Controller('command-centre')
@Roles('owner')
export class CommandCentreController {
 constructor(private readonly service:CommandCentreService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
}
