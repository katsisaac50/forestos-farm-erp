import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {PerformanceTarget,PerformanceTargetSchema,PerformanceUpdate,PerformanceUpdateSchema} from './performance.schema';
import {PerformanceStrategyController} from './performance-strategy.controller';
import {PerformanceStrategyService} from './performance-strategy.service';
@Module({imports:[MongooseModule.forFeature([{name:PerformanceTarget.name,schema:PerformanceTargetSchema},{name:PerformanceUpdate.name,schema:PerformanceUpdateSchema}])],controllers:[PerformanceStrategyController],providers:[PerformanceStrategyService]})
export class PerformanceStrategyModule{}
