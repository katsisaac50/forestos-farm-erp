import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateEvidenceDto {
 @IsString() @MinLength(7) @MaxLength(7) month: string;
 @IsIn(['Receipt','Invoice','Bank statement','Photo','Email','Approval','Reconciliation','Other']) evidenceType: string;
 @IsString() @MinLength(2) @MaxLength(160) title: string;
 @IsString() @MinLength(2) @MaxLength(2000) description: string;
 @IsString() @MinLength(2) @MaxLength(500) reference: string;
 @IsOptional() @IsString() @MaxLength(80) sourceActionId?: string;
}
