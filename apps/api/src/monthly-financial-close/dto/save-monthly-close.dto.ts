import { IsNumber, IsObject, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveMonthlyCloseDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!: string;
  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) cashCountUgx!: number;
  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) bankStatementBalanceUgx!: number;
  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) mobileMoneyBalanceUgx!: number;
  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) otherAccountBalanceUgx!: number;
  @IsObject() checklist!: Record<string, boolean>;
  @IsString() @MinLength(8) @MaxLength(2000) preparerNote!: string;
  @IsOptional() @IsString() @MaxLength(2000) varianceExplanation?: string;
}