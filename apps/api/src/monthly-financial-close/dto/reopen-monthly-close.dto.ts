import { IsString, MaxLength, MinLength } from 'class-validator';
export class ReopenMonthlyCloseDto {
  @IsString() @MinLength(8) @MaxLength(1000) reason!: string;
}