import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OperatingHourDto {
  @IsInt() @Min(1) @Max(7) day_of_week!: number;
  @Matches(TIME_RE, { message: 'opening_time must be HH:mm' }) opening_time!: string;
  @Matches(TIME_RE, { message: 'closing_time must be HH:mm' }) closing_time!: string;
  @IsOptional() @IsBoolean() is_closed?: boolean;
}

export class PutOperatingHoursDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OperatingHourDto)
  hours!: OperatingHourDto[];
}
