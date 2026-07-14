import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { INDIA_E164_REGEX } from '../../../shared/validation/dtos/phone.dto';
import { SLUG_REGEX } from '../../../shared/validation/dtos/slug.dto';
import { ALLOWED_AMENITIES } from './venue-common';

const toNumber = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

export class CreateVenueDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;

  @IsString() @MinLength(3) @MaxLength(64) @Matches(SLUG_REGEX, { message: 'slug must be lowercase kebab-case' }) slug!: string;

  @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @IsOptional() @Matches(INDIA_E164_REGEX, { message: 'phone must be E.164 India' }) phone?: string;

  @IsOptional() @IsEmail() email?: string;

  @IsString() @MaxLength(500) address!: string;
  @IsOptional() @IsString() @MaxLength(120) area?: string;
  @IsIn(['Nashik']) city!: string;
  @IsIn(['Maharashtra']) state!: string;
  @IsOptional() @IsString() @MaxLength(20) postal_code?: string;

  @Transform(toNumber) @IsLatitude() latitude!: number;
  @Transform(toNumber) @IsLongitude() longitude!: number;

  @IsOptional() @IsUrl({ require_protocol: true }) google_maps_url?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(ALLOWED_AMENITIES as unknown as string[], { each: true, message: 'unsupported amenity' })
  amenities?: string[];
}
