import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ReinvestmentDecisionEngineService } from './reinvestment-decision-engine.service';
@Controller('reinvestment-decision-engine')
@Roles('owner')
export class ReinvestmentDecisionEngineController {
 constructor(private service:ReinvestmentDecisionEngineService){}
 @Get() report(){return this.service.report();}
}
