import {IsDateString,IsIn,IsOptional,IsString,MaxLength} from 'class-validator';
export class CreateEvidenceDto {
 @IsString() inspectionId!:string;
 @IsString() siteOrBlock!:string;
 @IsString() fileName!:string;
 @IsIn(['image/jpeg','image/png','image/webp']) mimeType!:string;
 @IsString() dataBase64!:string;
 @IsOptional() @IsString() @MaxLength(500) caption?:string;
 @IsOptional() @IsDateString() capturedAt?:string;
}
