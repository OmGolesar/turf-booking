import { IsIn, IsString, Matches } from 'class-validator';

const PLATFORMS = ['ANDROID', 'IOS'] as const;
const VARIANTS = ['CUSTOMER', 'PARTNER'] as const;

// Semver-lite: MAJOR.MINOR.PATCH with optional -pre / +build. Enough to compare.
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export class VersionCheckDto {
  @IsIn(PLATFORMS) platform!: (typeof PLATFORMS)[number];
  @IsIn(VARIANTS) variant!: (typeof VARIANTS)[number];
  @IsString() @Matches(SEMVER_RE, { message: 'PLATFORM_VERSION_INVALID' }) version!: string;
}
