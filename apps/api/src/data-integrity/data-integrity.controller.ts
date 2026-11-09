import {Controller,Get} from '@nestjs/common';
import {DataIntegrityService} from './data-integrity.service';
import {Roles} from '../auth/roles.decorator';
@Controller('data-integrity')
@Roles('owner')
export class DataIntegrityController {
 constructor(private service:DataIntegrityService){}
 @Get('report') report(){return this.service.report();}
}
