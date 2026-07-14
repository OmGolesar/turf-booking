import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// The service accepts either price_per_slot (rupees) or price_paise (paise).
// At least one must be present on create; both may be sent (they must agree).
export class CreatePricingRuleDto {
  @IsString() @MaxLength(120) name!: string;

  @IsOptional() @IsInt() @Min(1) @Max(7) day_of_week?: number | null;

  @Matches(TIME_RE) start_time!: string;
  @Matches(TIME_RE) end_time!: string;

  @IsOptional() @IsInt() @Min(1) price_per_slot?: number; // rupees
  @IsOptional() @IsInt() @Min(1) price_paise?: number;

  @IsInt() @Min(0) priority!: number;

  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
}

export class UpdatePricingRuleDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(7) day_of_week?: number | null;
  @IsOptional() @Matches(TIME_RE) start_time?: string;
  @IsOptional() @Matches(TIME_RE) end_time?: string;
  @IsOptional() @IsInt() @Min(1) price_per_slot?: number;
  @IsOptional() @IsInt() @Min(1) price_paise?: number;
  @IsOptional() @IsInt() @Min(0) priority?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
}
