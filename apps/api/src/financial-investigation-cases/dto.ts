import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateInvestigationCaseDto {
 @IsString() @MinLength(3) @MaxLength(80) caseCode!: string;
 @IsString() @MinLength(3) @MaxLength(160) title!: string;
 @IsIn(['critical','high','review','medium','low']) severity!: string;
 @IsString() @MinLength(5) @MaxLength(2000) description!: string;
 @IsString() @MinLength(2) @MaxLength(80) sourceType!: string;
 @IsString() @MinLength(1) @MaxLength(160) sourceReference!: string;
 @IsOptional() @IsString() @MaxLength(160) assignedTo?: string;
}
export class UpdateInvestigationCaseDto {
 @IsOptional() @IsString() @MaxLength(160) assignedTo?: string;
 @IsOptional() @IsString() @MaxLength(2000) note?: string;
 @IsOptional() @IsString() @MaxLength(300) evidenceReference?: string;
 @IsOptional() @IsIn(['open','under_investigation','awaiting_evidence','resolved','closed']) status?: string;
 @IsOptional() @IsString() @MaxLength(2000) resolutionSummary?: string;
 @IsOptional() @IsString() @MaxLength(500) closeReason?: string;
 @IsOptional() @Type(() => Number) @IsInt() @Min(1) expectedVersion?: number;
}
