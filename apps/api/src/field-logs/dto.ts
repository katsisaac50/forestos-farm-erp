import { IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
export class CreateFieldLogDto {
 @IsString() logId!:string;
 @IsDateString() date!:string;
 @IsIn(['Forestry','Beekeeping','General']) workstream!:string;
 @IsString() siteOrBlock!:string;
 @IsString() observedBy!:string;
 @IsString() observation!:string;
 @IsOptional() @IsString() actionTaken?:string;
 @IsOptional() @IsString() followUpRequired?:string;
 @IsOptional() @IsDateString() followUpDue?:string;
 @IsOptional() @IsString() photoReference?:string;
 @IsOptional() @IsNumber() gpsLatitude?:number;
 @IsOptional() @IsNumber() gpsLongitude?:number;
 @IsOptional() @IsIn(['Low','Medium','High','Critical']) riskLevel?:string;
 @IsOptional() @IsIn(['Open','In progress','Resolved']) status?:string;
}
