import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFieldInspectionDto {
  @IsString() @MaxLength(100) title!: string;
  @IsIn(['eucalyptus', 'beekeeping', 'infrastructure', 'general'])
  activityType!: 'eucalyptus' | 'beekeeping' | 'infrastructure' | 'general';
  @IsIn(['routine', 'follow_up', 'incident'])
  inspectionType!: 'routine' | 'follow_up' | 'incident';
  @IsString() @MaxLength(120) assignedTo!: string;
  @IsString() @MaxLength(100) locationLabel!: string;
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional() @IsString() @MaxLength(40) blockCode?: string;
  @IsOptional() @IsString() @MaxLength(1000) checklistSummary?: string;
}

export class SubmitFieldInspectionDto {
  @IsOptional() @IsString() @MaxLength(1000) findings?: string;
  @IsOptional() @IsString() @MaxLength(1000) correctiveAction?: string;
  @IsOptional() @IsString() @MaxLength(500) evidenceReference?: string;
}

export class ReviewFieldInspectionDto {
  @IsIn(['verified', 'rejected']) status!: 'verified' | 'rejected';
  @IsString() @MaxLength(500) reviewNote!: string;
}
