import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class PhotoEvidenceMetadataDto {
 @IsString() @MinLength(1) @MaxLength(120) runId:string;
 @IsString() @MinLength(1) @MaxLength(120) farmBlock:string;
 @IsOptional() @IsString() @MaxLength(1000) caption?:string;
}
export class PhotoEvidenceReviewDto {
 @IsString() @MinLength(1) @MaxLength(1000) reviewNote:string;
}
