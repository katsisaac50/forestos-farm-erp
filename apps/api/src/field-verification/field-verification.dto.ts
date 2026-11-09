import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateFieldVerificationDto {
 @IsString() @MinLength(1) @MaxLength(120) runId:string;
 @IsString() @MinLength(1) @MaxLength(120) workerIdentifier:string;
 @IsString() @MinLength(1) @MaxLength(120) farmBlock:string;
 @IsString() @MinLength(1) @MaxLength(80) activityType:string;
 @IsLatitude() latitude:number;
 @IsLongitude() longitude:number;
 @IsNumber() @Min(0) @Max(100000) accuracyMeters:number;
 @IsString() @MinLength(1) @MaxLength(240) evidenceReference:string;
 @IsOptional() @IsString() @MaxLength(1000) workerNote?:string;
}
export class ReviewFieldVerificationDto {
 @IsString() @MinLength(1) @MaxLength(1000) reviewNote:string;
}
