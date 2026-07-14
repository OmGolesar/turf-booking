import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform } from '@prisma/client';

const PLATFORMS = [DevicePlatform.ANDROID, DevicePlatform.IOS, DevicePlatform.WEB];

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  token!: string;

  @IsIn(PLATFORMS)
  platform!: DevicePlatform;

  @IsString()
  @MaxLength(128)
  device_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  app_version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  os_version?: string;
}
