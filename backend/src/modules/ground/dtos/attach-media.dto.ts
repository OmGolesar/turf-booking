import { IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class AttachGroundMediaDto {
  @IsUrl({ require_protocol: true }) file_url!: string;
  @IsOptional() @IsInt() @Min(0) display_order?: number;
}

export class UpdateGroundMediaDto {
  @IsOptional() @IsInt() @Min(0) display_order?: number;
}
