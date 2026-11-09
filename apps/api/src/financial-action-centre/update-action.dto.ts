import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateActionDto {
  @IsOptional() @IsIn(['Open', 'In progress', 'Awaiting verification', 'Completed']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) actionNote?: string;
  @IsOptional() @IsString() @MaxLength(120) assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(500) verificationNote?: string;
}
