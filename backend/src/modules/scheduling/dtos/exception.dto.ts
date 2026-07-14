import { IsBoolean, IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateExceptionDto {
  @IsString() @MaxLength(200) title!: string;
  @IsDateString() exception_date!: string; // YYYY-MM-DD
  @Matches(TIME_RE) start_time!: string;
  @Matches(TIME_RE) end_time!: string;
  @IsOptional() @IsBoolean() is_closed?: boolean;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
