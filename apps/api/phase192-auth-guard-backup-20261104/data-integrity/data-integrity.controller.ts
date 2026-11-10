import {Controller,Get,UseGuards} from '@nestjs/common';
import {DataIntegrityService} from './data-integrity.service';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {RolesGuard} from '../auth/roles.guard';
import {Roles} from '../auth/roles.decorator';
@Controller('data-integrity')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('owner')
export class DataIntegrityController {
 constructor(private service:DataIntegrityService){}
 @Get('report') report(){return this.service.report();}
}
