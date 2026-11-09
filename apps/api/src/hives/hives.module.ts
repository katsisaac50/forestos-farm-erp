import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {Hive,HiveSchema} from './hive.schema';
import {HivesController} from './hives.controller';
import {HivesService} from './hives.service';
import {OrganizationsModule} from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{name:Hive.name,schema:HiveSchema}]),
    OrganizationsModule,
  ],
  controllers:[HivesController],
  providers:[HivesService],
})
export class HivesModule{}