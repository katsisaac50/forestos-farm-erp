import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreateFinanceDto {
 @IsString() transactionId!: string;
 @IsDateString() date!: string;
 @IsIn(['Income','Expense','Transfer']) direction!: string;
 @IsIn(['Forestry','Beekeeping','Shared/Admin']) businessLine!: string;
 @IsString() category!: string;
 @IsString() description!: string;
 @IsNumber() @Min(0) amountUgx!: number;
 @IsOptional() @IsIn(['Cash','Mobile money','Bank','Other']) paymentMethod?: string;
 @IsOptional() @IsString() counterparty?: string;
 @IsOptional() @IsString() receiptReference?: string;
 @IsOptional() reconciled?: boolean;
 @IsOptional() @IsString() notes?: string;
}
