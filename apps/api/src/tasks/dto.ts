import {IsDateString,IsIn,IsNumber,IsOptional,IsString,Min} from 'class-validator';
export class CreateTaskDto {
 @IsString() taskId!:string; @IsString() title!:string; @IsIn(['Forestry','Beekeeping','Finance','Sales','Admin','Compliance']) workstream!:string;
 @IsString() responsiblePerson!:string; @IsDateString() dueDate!:string;
 @IsOptional() @IsIn(['High','Medium','Low']) priority?:string;
 @IsOptional() @IsIn(['Not started','In progress','Blocked','Completed','Cancelled']) status?:string;
 @IsOptional() @IsDateString() completedDate?:string; @IsOptional() @IsNumber() @Min(0) budgetUgx?:number;
 @IsOptional() @IsNumber() @Min(0) actualCostUgx?:number; @IsOptional() @IsString() evidenceReference?:string; @IsOptional() @IsString() notes?:string;
}
