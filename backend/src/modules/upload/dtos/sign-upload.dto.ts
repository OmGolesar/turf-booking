import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const UPLOAD_PURPOSES = [
  'VENUE_COVER',
  'VENUE_GALLERY',
  'VENUE_LOGO',
  'GROUND_MEDIA',
  'AVATAR',
] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export class SignUploadDto {
  @IsIn(UPLOAD_PURPOSES) purpose!: UploadPurpose;
  @IsIn(ALLOWED_CONTENT_TYPES) content_type!: (typeof ALLOWED_CONTENT_TYPES)[number];

  @IsInt() @Min(1) @Max(MAX_UPLOAD_BYTES) size_bytes!: number;
  @IsOptional() @IsUUID() target_id?: string;
}
