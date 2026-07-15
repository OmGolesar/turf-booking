import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateBookingSessionDto {
  @IsUUID() ground_id!: string;
  @Matches(DATE_RE, { message: 'booking_date must be YYYY-MM-DD' }) booking_date!: string;
  @Matches(TIME_RE, { message: 'start_time must be HH:mm' }) start_time!: string;
  @IsOptional() @IsInt() @Min(15) @Max(240) duration_minutes?: number;
}
