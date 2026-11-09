import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistryRecord, RegistryRecordSchema } from './registry-record.schema';
import { RegistryCommit, RegistryCommitSchema } from './registry-commit.schema';
import { RegistryPersistenceController } from './registry-persistence.controller';
import { RegistryPersistenceService } from './registry-persistence.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: RegistryRecord.name, schema: RegistryRecordSchema },
    { name: RegistryCommit.name, schema: RegistryCommitSchema },
  ])],
  controllers: [RegistryPersistenceController],
  providers: [RegistryPersistenceService],
  exports: [RegistryPersistenceService],
})
export class RegistryPersistenceModule {}
