import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FieldVerification, FieldVerificationSchema } from './field-verification.schema';
import { FieldVerificationService } from './field-verification.service';
import { FieldVerificationController } from './field-verification.controller';
@Module({imports:[MongooseModule.forFeature([{name:FieldVerification.name,schema:FieldVerificationSchema}])],controllers:[FieldVerificationController],providers:[FieldVerificationService],exports:[FieldVerificationService]})
export class FieldVerificationModule {}
