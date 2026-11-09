import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class CreateFinancialInvestigationDto {
 @Matches(/^\\d{4}-(0[1-9]|1[0-2])$/) month!: string;
 @IsIn(['Missing receipt','Possible duplicate','Unmatched statement row','Reconciliation difference','Other']) exceptionType!: string;
 @IsString() @MinLength(1) @MaxLength(160) sourceReference!: string;
 @IsString() @MinLength(3) @MaxLength(160) title!: string;
 @IsString() @MinLength(3) @MaxLength(3000) description!: string;
 @IsIn(['Low','Medium','High']) priority!: string;
 @IsString() @MinLength(1) @MaxLength(160) assignedTo!: string;
 @IsDateString() dueDate!: string;
 @IsOptional() @IsString() @MaxLength(1000) evidenceReference?: string;
}
export class UpdateFinancialInvestigationDto {
 @IsOptional() @IsIn(['Low','Medium','High']) priority?: string;
 @IsOptional() @IsIn(['Open','Under investigation','Awaiting evidence','Resolved','Closed - reviewed']) status?: string;
 @IsOptional() @IsString() @MaxLength(160) assignedTo?: string;
 @IsOptional() @IsDateString() dueDate?: string;
 @IsOptional() @IsString() @MaxLength(1000) evidenceReference?: string;
 @IsOptional() @IsString() @MaxLength(3000) resolutionNote?: string;
 @IsOptional() @IsString() @MaxLength(3000) reviewNote?: string;
}
