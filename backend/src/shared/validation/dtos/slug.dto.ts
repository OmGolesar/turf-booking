import { Matches, MaxLength, MinLength } from 'class-validator';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SlugDto {
  @MinLength(3)
  @MaxLength(64)
  @Matches(SLUG_REGEX, { message: 'Slug must be lowercase kebab-case (letters, digits, dashes).' })
  slug!: string;
}
