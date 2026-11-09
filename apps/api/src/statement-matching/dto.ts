import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class ImportStatementDto {
  @IsString() @MinLength(1) @MaxLength(120) accountName!: string;
  @IsIn(['Cash', 'Bank', 'Mobile money', 'Other']) accountType!: string;
  @Matches(/^\\d{4}-(0[1-9]|1[0-2])$/) month!: string;
  @IsString() @MinLength(1) @MaxLength(80) fileName!: string;
  @IsString() @MinLength(1) @MaxLength(2000000) csvText!: string;
}
export class MatchDecisionDto {
  @IsIn(['confirm', 'reject', 'ignore']) decision!: string;
  @IsString() transactionId!: string;
}
