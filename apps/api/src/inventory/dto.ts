import {IsNumber,IsOptional,IsString,Min} from 'class-validator';
export class CreateInventoryDto {
 @IsString() itemId!:string; @IsString() name!:string; @IsString() category!:string; @IsString() unit!:string;
 @IsNumber() @Min(0) openingStock!:number; @IsNumber() @Min(0) received!:number; @IsNumber() @Min(0) used!:number;
 @IsNumber() @Min(0) reorderLevel!:number; @IsOptional() @IsString() supplier?:string;
 @IsOptional() @IsString() storageLocation?:string; @IsOptional() @IsString() notes?:string;
}
