import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class ReviewMonthlyCloseDto {
  @IsString() @MinLength(5) @MaxLength(1000) reviewerNote!: string;
  @IsOptional() @IsString() @MaxLength(2000) exceptionDisposition?: string;
}