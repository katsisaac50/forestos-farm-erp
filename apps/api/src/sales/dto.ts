import {IsDateString,IsIn,IsNumber,IsOptional,IsString,Min} from 'class-validator';
export class CreateSalesDto {
 @IsString() orderId!:string; @IsDateString() orderDate!:string; @IsString() customerName!:string;
 @IsOptional() @IsString() phone?:string; @IsString() product!:string; @IsNumber() @Min(0) quantity!:number;
 @IsString() unit!:string; @IsNumber() @Min(0) unitPriceUgx!:number; @IsNumber() @Min(0) amountPaidUgx!:number;
 @IsOptional() @IsIn(['Enquiry','Confirmed','Part-paid','Paid','Delivered','Cancelled']) status?:string;
 @IsOptional() @IsDateString() dueDate?:string; @IsOptional() @IsString() notes?:string;
}
