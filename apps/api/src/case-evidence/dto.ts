import {IsOptional,IsString,MaxLength,MinLength} from 'class-validator';
export class ReviewEvidenceDto {
 @IsString() @MinLength(3) @MaxLength(500) reason!:string;
 @IsOptional() @IsString() @MaxLength(2000) description?:string;
}
export class QuarantineEvidenceDto {
 @IsString() @MinLength(3) @MaxLength(500) reason!:string;
}
