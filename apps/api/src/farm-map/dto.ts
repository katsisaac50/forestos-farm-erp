import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateFarmMapFeatureDto {
  @IsIn(['block','hive','inspection_point','access_point','other']) featureType!: 'block'|'hive'|'inspection_point'|'access_point'|'other';
  @IsIn(['Point','Polygon']) geometryType!: 'Point'|'Polygon';
  geometry!: { type: 'Point'|'Polygon'; coordinates: any };
  @IsString() @MaxLength(100) label!: string;
  @IsOptional() @IsString() @MaxLength(40) blockCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000) areaAcres?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsIn(['manual','gps','imported']) source!: 'manual'|'gps'|'imported';
}
