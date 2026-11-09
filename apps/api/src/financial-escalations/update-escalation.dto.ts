import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class UpdateEscalationDto {
 @IsOptional() @IsIn(['Open','Acknowledged','Action required','Resolved']) status?: string;
 @IsOptional() @IsString() @MaxLength(120) assignedTo?: string;
 @IsOptional() @IsString() @MaxLength(2000) resolutionNote?: string;
}
