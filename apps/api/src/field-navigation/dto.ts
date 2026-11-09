import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNavigationTargetDto {
  @IsString() @MaxLength(100) title!: string;
  @IsIn(['block', 'hive', 'inspection_point', 'access_point', 'other'])
  targetType!: 'block' | 'hive' | 'inspection_point' | 'access_point' | 'other';
  @IsString() @MaxLength(120) targetLabel!: string;
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional() @IsString() @MaxLength(40) blockCode?: string;
  @IsOptional() @IsString() @MaxLength(500) instructions?: string;
  @IsIn(['manual', 'gps', 'map_feature']) source!: 'manual' | 'gps' | 'map_feature';
}
