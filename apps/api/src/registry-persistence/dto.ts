import { IsArray, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistryIncomingRecordDto {
  @IsString() domain!: string;
  @IsString() recordId!: string;
  @IsString() recordedAt!: string;
  @IsObject() payload!: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) masterVersion?: number;
  @IsOptional() @IsString() operation?: 'create' | 'update' | 'upsert';
}
export class RegistryBatchDto {
  @IsString() batchId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RegistryIncomingRecordDto)
  incoming!: RegistryIncomingRecordDto[];
  @IsOptional() @IsInt() @Min(0) expectedRevision?: number;
}
