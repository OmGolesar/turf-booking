import { IsIn, IsInt, IsOptional, IsUrl, Min } from 'class-validator';
import { MediaType } from '@prisma/client';

const TYPES = [MediaType.COVER, MediaType.GALLERY, MediaType.LOGO];

export class AttachVenueMediaDto {
  @IsUrl({ require_protocol: true }) file_url!: string;
  @IsIn(TYPES) media_type!: MediaType;
  @IsOptional() @IsInt() @Min(0) display_order?: number;
}

export class UpdateVenueMediaDto {
  @IsOptional() @IsIn(TYPES) media_type?: MediaType;
  @IsOptional() @IsInt() @Min(0) display_order?: number;
}
