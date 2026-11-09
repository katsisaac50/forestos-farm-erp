import {IsDateString,IsNumber,IsOptional,IsString,Min} from 'class-validator';
export class CreateGrowthSampleDto {
 @IsString() blockId!:string;
 @IsDateString() sampleDate!:string;
 @IsString() sampleCode!:string;
 @IsNumber() @Min(1) treeCount!:number;
 @IsNumber() @Min(0) averageHeightM!:number;
 @IsNumber() @Min(0) averageDbhCm!:number;
 @IsOptional() @IsString() notes?:string;
}
