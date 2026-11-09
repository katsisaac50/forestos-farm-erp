import {IsDateString,IsIn,IsOptional,IsString,MinLength} from 'class-validator';
export class CreateInspectionDto {
 @IsString() @MinLength(3) inspectionId!:string;
 @IsIn(['Forestry','Beekeeping','General']) workstream!:string;
 @IsString() siteOrBlock!:string;
 @IsString() title!:string;
 @IsDateString() dueDate!:string;
 @IsString() assignedTo!:string;
 @IsOptional() @IsIn(['Low','Medium','High','Critical']) priority?:string;
 @IsOptional() @IsString() checklist?:string;
}
export class UpdateInspectionDto {
 @IsOptional() @IsIn(['Scheduled','In progress','Completed','Overdue']) status?:string;
 @IsOptional() @IsString() findings?:string;
 @IsOptional() @IsString() correctiveAction?:string;
 @IsOptional() @IsString() photoReference?:string;
}
