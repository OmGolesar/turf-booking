import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { BookingSource, BookingStatus } from '@prisma/client';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = Object.values(BookingStatus);
const SOURCES = Object.values(BookingSource);

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value;

export class ListPartnerBookingsDto {
  @IsOptional() @IsString() venue_id?: string;
  @IsOptional() @IsString() ground_id?: string;
  @IsOptional() @Transform(toList) @IsIn(STATUSES, { each: true }) status?: BookingStatus[];
  @IsOptional() @Transform(toList) @IsIn(SOURCES, { each: true }) source?: BookingSource[];
  @IsOptional() @Matches(DATE_RE) from?: string;
  @IsOptional() @Matches(DATE_RE) to?: string;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}
