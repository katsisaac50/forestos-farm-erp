import { IsIn, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
export class CreateReconciliationDto {
  @IsString() accountName!: string;
  @IsIn(['Cash', 'Bank', 'Mobile money', 'Other']) accountType!: string;
  @Matches(/^\\d{4}-(0[1-9]|1[0-2])$/) month!: string;
  @IsNumber() @Min(0) openingBalanceUgx!: number;
  @IsNumber() @Min(0) statementClosingBalanceUgx!: number;
  @IsNumber() @Min(0) statementIncomeUgx!: number;
  @IsNumber() @Min(0) statementExpenseUgx!: number;
  @IsOptional() @IsString() notes?: string;
}
