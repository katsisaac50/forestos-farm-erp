import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VideoEvidenceMetadataDto {
  @IsString() runId!: string;
  @IsString() farmBlock!: string;
  @IsOptional() @IsString() @MaxLength(1000) caption?: string;
}

export class VideoEvidenceReviewDto {
  @IsString() @MaxLength(1000) reviewNote!: string;
}