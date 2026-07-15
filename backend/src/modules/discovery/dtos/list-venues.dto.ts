import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const toNumber = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

const toBool = ({ value }: { value: unknown }): boolean | unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value;

export class ListVenuesDto {
  @IsOptional() @IsString() q?: string;

  @IsOptional() @Transform(toList) sport?: string[];
  @IsOptional() @Transform(toList) amenities?: string[];

  @IsOptional() @Transform(toNumber) @IsNumber() @Min(0) @Max(5) min_rating?: number;

  @IsOptional() @Transform(toBool) indoor?: boolean;

  @IsOptional() @IsString() sort?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, { message: 'near must be "lat,lng"' })
  near?: string;

  @IsOptional() @Transform(toNumber) @IsNumber() @Min(0.1) @Max(50) radius_km?: number;

  @IsOptional() @Transform(toNumber) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}

export class NearMeDto {
  @Transform(toNumber) @IsLatitude() lat!: number;
  @Transform(toNumber) @IsLongitude() lng!: number;
  @IsOptional() @Transform(toNumber) @IsNumber() @Min(0.1) @Max(50) radius_km?: number;
  @IsOptional() @Transform(toNumber) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}

export class AvailabilityQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' }) date!: string;
  @IsOptional() @Transform(toNumber) @IsInt() @Min(15) @Max(240) duration?: number;
}

export class ListReviewsDto {
  @IsOptional() @Transform(toNumber) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}
