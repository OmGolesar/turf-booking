import { IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

const NAME_REGEX = /^[\p{L}\s\-'.]+$/u;
const LANGUAGES = ['en', 'hi', 'mr'] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(NAME_REGEX, { message: 'first_name may only contain letters, spaces, hyphens, apostrophes, and dots.' })
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(NAME_REGEX, { message: 'last_name may only contain letters, spaces, hyphens, apostrophes, and dots.' })
  last_name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  avatar_url?: string;

  // MVP is Nashik-only; accepting the field so the schema is future-safe but clamping the value.
  @IsOptional()
  @IsIn(['Nashik'])
  city?: string;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: (typeof LANGUAGES)[number];
}
