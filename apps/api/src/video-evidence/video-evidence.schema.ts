import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class VideoEvidence {
  @Prop({ required: true }) runId!: string;
  @Prop({ required: true }) farmBlock!: string;
  @Prop({ required: true }) uploadedBy!: string;
  @Prop({ required: true }) originalName!: string;
  @Prop({ required: true }) mimeType!: string;
  @Prop({ required: true }) sizeBytes!: number;
  @Prop({ required: true }) sha256!: string;
  @Prop() caption?: string;
  @Prop({ default: 'pending_review' }) reviewStatus!: string;
  @Prop() reviewNote?: string;
  @Prop() reviewBy?: string;
  @Prop() reviewedAt?: Date;
  @Prop({ required: true }) storagePath!: string;
}
export const VideoEvidenceSchema = SchemaFactory.createForClass(VideoEvidence);