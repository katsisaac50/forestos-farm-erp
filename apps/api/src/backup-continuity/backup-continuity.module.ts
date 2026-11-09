import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {BackupRecord,BackupRecordSchema} from './backup-record.schema';
import {BackupContinuityController} from './backup-continuity.controller';
import {BackupContinuityService} from './backup-continuity.service';
@Module({imports:[MongooseModule.forFeature([{name:BackupRecord.name,schema:BackupRecordSchema}])],controllers:[BackupContinuityController],providers:[BackupContinuityService]})
export class BackupContinuityModule{}
