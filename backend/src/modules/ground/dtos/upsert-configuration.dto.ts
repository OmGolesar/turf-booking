import { IsInt, IsOptional, Min } from 'class-validator';

export class UpsertGroundConfigurationDto {
  @IsInt() @Min(1) booking_duration!: number;
  @IsInt() @Min(1) booking_interval!: number;
  @IsOptional() @IsInt() @Min(0) buffer_time?: number;
  @IsOptional() @IsInt() @Min(0) cleaning_time?: number;
  @IsOptional() @IsInt() @Min(1) max_advance_booking_days?: number;
  @IsOptional() @IsInt() @Min(0) min_notice_minutes?: number;
  @IsOptional() @IsInt() @Min(0) cancellation_window_hours?: number;
}
