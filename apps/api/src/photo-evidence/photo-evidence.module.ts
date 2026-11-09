import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotoEvidence, PhotoEvidenceSchema } from './photo-evidence.schema';
import { PhotoEvidenceService } from './photo-evidence.service';
import { PhotoEvidenceController } from './photo-evidence.controller';
@Module({imports:[MongooseModule.forFeature([{name:PhotoEvidence.name,schema:PhotoEvidenceSchema}])],controllers:[PhotoEvidenceController],providers:[PhotoEvidenceService],exports:[PhotoEvidenceService]})
export class PhotoEvidenceModule {}
