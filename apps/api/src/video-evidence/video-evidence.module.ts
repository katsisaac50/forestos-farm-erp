import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VideoEvidence, VideoEvidenceSchema } from './video-evidence.schema';
import { VideoEvidenceController } from './video-evidence.controller';
import { VideoEvidenceService } from './video-evidence.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VideoEvidence.name, schema: VideoEvidenceSchema }]),
    OrganizationsModule,
  ],
  controllers: [VideoEvidenceController],
  providers: [VideoEvidenceService],
})
export class VideoEvidenceModule {}