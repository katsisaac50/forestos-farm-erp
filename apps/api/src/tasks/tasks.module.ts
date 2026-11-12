import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FieldTask, FieldTaskSchema } from './tasks.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FieldTask.name, schema: FieldTaskSchema }]),
    OrganizationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}

// import {Module} from '@nestjs/common';import {MongooseModule} from '@nestjs/mongoose';import {FieldTask,FieldTaskSchema} from './tasks.schema';import {TasksController} from './tasks.controller';import {TasksService} from './tasks.service';
// @Module({imports:[MongooseModule.forFeature([{name:FieldTask.name,schema:FieldTaskSchema}])],controllers:[TasksController],providers:[TasksService]}) export class TasksModule{}
