import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateCorrectiveActionDto {
 @IsString() @MaxLength(120) title!:string;
 @IsString() @MaxLength(1000) description!:string;
 @IsIn(['low','medium','high','critical']) priority!:'low'|'medium'|'high'|'critical';
 @IsString() @MaxLength(120) assignedTo!:string;
 @IsDateString() dueAt!:string;
 @IsOptional() @IsString() @MaxLength(100) farmBlock?:string;
 @IsOptional() @IsString() @MaxLength(120) locationLabel?:string;
 @IsOptional() @IsString() @MaxLength(80) sourceInspectionId?:string;
}
export class UpdateCorrectiveActionDto {
 @IsIn(['open','in_progress','submitted']) status!:'open'|'in_progress'|'submitted';
 @IsOptional() @IsString() @MaxLength(1000) completionNote?:string;
}
export class ReviewCorrectiveActionDto {
 @IsIn(['closed','in_progress']) status!:'closed'|'in_progress';
 @IsString() @MaxLength(500) reviewNote!:string;
}


/** Explicitly create a corrective action from a persisted field inspection. */
export class CreateFromInspectionDto {
 @IsIn(['low','medium','high','critical']) priority!: 'low'|'medium'|'high'|'critical';
 @IsString() @MaxLength(120) assignedTo!: string;
 @IsDateString() dueAt!: string;
}
