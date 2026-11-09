import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FieldNavigationController } from './field-navigation.controller';
import { FieldNavigationService } from './field-navigation.service';
import { FieldNavigationRecord, FieldNavigationSchema } from './field-navigation.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FieldNavigationRecord.name, schema: FieldNavigationSchema }])],
  controllers: [FieldNavigationController],
  providers: [FieldNavigationService],
})
export class FieldNavigationModule {}
